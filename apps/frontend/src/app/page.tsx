'use client';

import { useState } from 'react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'storefront' | 'admin'>('storefront');

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center font-bold text-white shadow-lg shadow-red-500/20">
              FR
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">FlashReserve</h1>
              <p className="text-xs text-slate-400">High-Concurrency Reservation Engine</p>
            </div>
          </div>

          {/* Navigation Mode */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setActiveTab('storefront')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                activeTab === 'storefront'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Customer Storefront
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                activeTab === 'admin'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Admin Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-12 px-4 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 mb-4">
            Sub-2.5ms P95 Latency • Atomic Redis Lua Allocation
          </span>
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Zero-Oversell Flash Sale Platform
          </h2>
          <p className="mt-4 text-base text-slate-400">
            Engineered for 10,000–20,000 req/sec traffic spikes with Redis Streams, PostgreSQL 18 vectorized persistence, and PASETO security.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="text-red-500 font-semibold mb-2">⚡ Atomic Lua Hot Path</div>
            <p className="text-sm text-slate-400">
              Validates campaign window, stock count, per-user limits, and idempotency inside a single atomic Redis Lua script.
            </p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="text-blue-500 font-semibold mb-2">📦 Vectorized Persistence</div>
            <p className="text-sm text-slate-400">
              Background workers ingest batches of up to 500 events using PostgreSQL parameterized UNNEST queries.
            </p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="text-green-500 font-semibold mb-2">🔒 Mutual Exclusion Checkout</div>
            <p className="text-sm text-slate-400">
              Conditional database status transitions prevent payment confirmations from racing with expiration sweeps.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

