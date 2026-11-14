-- reserve_stock.lua
-- Atomic stock reservation, idempotency enforcement, and event streaming.
--
-- KEYS:
-- 1: stockKey      (flash:stock:{campaignId})
-- 2: metaKey       (flash:meta:{campaignId})
-- 3: userKey       (flash:user:{campaignId}:userId)
-- 4: idemKey       (flash:idem:{campaignId}:idempotencyKey)
-- 5: resKey        (flash:res:{campaignId}:reservationId)
-- 6: streamKey     (stream:reservations)
--
-- ARGV:
-- 1: campaignId
-- 2: userId
-- 3: reservationId (ULID)
-- 4: quantity (positive integer)
-- 5: payloadHash (sha256 of normalized body)
-- 6: nowMs (current timestamp in milliseconds)
-- 7: ttlSeconds (reservation TTL, e.g. 600)

local stockKey  = KEYS[1]
local metaKey   = KEYS[2]
local userKey   = KEYS[3]
local idemKey   = KEYS[4]
local resKey    = KEYS[5]
local streamKey = KEYS[6]

local campaignId    = ARGV[1]
local userId        = ARGV[2]
local reservationId = ARGV[3]
local quantity      = tonumber(ARGV[4])
local payloadHash   = ARGV[5]
local nowMs         = tonumber(ARGV[6])
local ttlSeconds    = tonumber(ARGV[7])

-- 1. Idempotency Check
if redis.call("EXISTS", idemKey) == 1 then
  local storedHash = redis.call("HGET", idemKey, "payloadHash")
  if storedHash == payloadHash then
    local storedResponse = redis.call("HGET", idemKey, "responseJson")
    return {"IDEMPOTENT_REPLAY", storedResponse}
  else
    return {"PAYLOAD_MISMATCH", "Idempotency key reused with different request payload"}
  end
end

-- 2. Campaign Metadata & Time Window Validation
if redis.call("EXISTS", metaKey) == 0 then
  return {"NOT_FOUND", "Campaign does not exist in Redis"}
end

local meta = redis.call("HMGET", metaKey, "isActive", "startsAt", "endsAt")
local isActive = meta[1]
local startsAt = tonumber(meta[2] or "0")
local endsAt   = tonumber(meta[3] or "0")

if isActive ~= "true" then
  return {"INACTIVE", "Campaign is not currently active"}
end

if startsAt > 0 and nowMs < startsAt then
  return {"NOT_STARTED", "Campaign has not started yet"}
end

if endsAt > 0 and nowMs > endsAt then
  return {"ENDED", "Campaign has already ended"}
end

-- 3. One Reservation Per User Per Campaign
if redis.call("EXISTS", userKey) == 1 then
  local existingResId = redis.call("GET", userKey)
  return {"ALREADY_RESERVED", existingResId}
end

-- 4. Check Stock Availability
local currentStock = tonumber(redis.call("GET", stockKey) or "0")
if currentStock < quantity then
  return {"SOLD_OUT", tostring(currentStock)}
end

-- 5. Atomic State Mutations
-- Decrement inventory
local remainingStock = redis.call("DECRBY", stockKey, quantity)

-- Set user lock
redis.call("SET", userKey, reservationId, "EX", ttlSeconds)

local expiresAt = nowMs + (ttlSeconds * 1000)

-- Construct response JSON
local responseJson = cjson.encode({
  reservationId = reservationId,
  campaignId = campaignId,
  userId = userId,
  quantity = quantity,
  status = "RESERVED",
  remainingStock = remainingStock,
  expiresAt = expiresAt,
  createdAt = nowMs
})

-- Persist reservation hash with TTL
redis.call("HMSET", resKey,
  "id", reservationId,
  "campaignId", campaignId,
  "userId", userId,
  "quantity", quantity,
  "status", "RESERVED",
  "expiresAt", tostring(expiresAt),
  "createdAt", tostring(nowMs)
)
redis.call("EXPIRE", resKey, ttlSeconds)

-- Record idempotency state
redis.call("HMSET", idemKey,
  "reservationId", reservationId,
  "payloadHash", payloadHash,
  "responseJson", responseJson
)
redis.call("EXPIRE", idemKey, ttlSeconds)

-- Append event to Redis Streams
redis.call("XADD", streamKey, "*",
  "eventId", reservationId,
  "eventType", "RESERVATION_CREATED",
  "campaignId", campaignId,
  "reservationId", reservationId,
  "userId", userId,
  "quantity", tostring(quantity),
  "status", "RESERVED",
  "timestamp", tostring(nowMs),
  "expiresAt", tostring(expiresAt)
)

return {"SUCCESS", responseJson, tostring(remainingStock)}
