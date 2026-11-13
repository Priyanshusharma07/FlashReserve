import type {
  AdminCampaignInventory,
  AdminDashboardSummary,
  AdminMetricsSummary,
  AdminReservationDetail,
  AdminReservationsQuery,
  CampaignResponse,
  CheckoutResponse,
  CreateCampaignInput,
  ListCampaignsQuery,
  LoginInput,
  LoginResponse,
  LogoutResponse,
  PaginatedResponse,
  RegisterInput,
  ReservationResponse,
  UserReservationItem,
  UserReservationsQuery,
} from '@flashreserve/shared-types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:3000';

export class ApiClient {
  private token: string | null = null;

  constructor() {
    // Restore token from localStorage in browser environment
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('flashreserve_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('flashreserve_token', token);
      } else {
        localStorage.removeItem('flashreserve_token');
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (this.token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message =
        errorBody.message ||
        (Array.isArray(errorBody.message) ? errorBody.message.join(', ') : null) ||
        `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(message);
    }

    const body = await response.json();
    return this.unwrap<T>(body);
  }

  /**
   * Safely unwraps API response envelopes:
   * Handles { success: boolean; data: T; meta?: PaginationMeta } as well as raw DTOs
   */
  private unwrap<T>(body: any): T {
    if (body && typeof body === 'object') {
      // If it's a paginated response with data array and meta, preserve the wrapper
      if ('data' in body && 'meta' in body) {
        return body as T;
      }
      // If it's a single wrapped response { success: true, data: T }
      if ('success' in body && 'data' in body && Object.keys(body).length <= 3) {
        return body.data as T;
      }
    }
    return body as T;
  }

  // =================== AUTH APIS ===================

  async register(data: RegisterInput): Promise<LoginResponse> {
    const res = await this.request<LoginResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.accessToken) {
      this.setToken(res.accessToken);
    }
    return res;
  }

  async login(data: LoginInput): Promise<LoginResponse> {
    const res = await this.request<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.accessToken) {
      this.setToken(res.accessToken);
    }
    return res;
  }

  async logout(): Promise<LogoutResponse> {
    try {
      return await this.request<LogoutResponse>('/api/v1/auth/logout', {
        method: 'POST',
      });
    } finally {
      this.setToken(null);
    }
  }

  async getMe() {
    return this.request<{ id: string; email: string; role: 'user' | 'admin'; name?: string }>('/api/v1/auth/me');
  }

  // =================== STOREFRONT CAMPAIGN APIS ===================

  async listCampaigns(query?: ListCampaignsQuery): Promise<PaginatedResponse<CampaignResponse>> {
    const params = new URLSearchParams();
    if (query?.status) params.set('status', query.status);
    if (query?.search) params.set('search', query.search);
    if (query?.page) params.set('page', query.page.toString());
    if (query?.limit) params.set('limit', query.limit.toString());
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<PaginatedResponse<CampaignResponse>>(`/api/v1/campaigns${qs}`);
  }

  async getCampaign(id: string): Promise<CampaignResponse> {
    return this.request<CampaignResponse>(`/api/v1/campaigns/${id}`);
  }

  // =================== RESERVATION APIS (HOT PATH) ===================

  async reserve(
    campaignId: string,
    quantity: number,
    idempotencyKey?: string,
  ): Promise<ReservationResponse> {
    const key =
      idempotencyKey ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `idem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

    return this.request<ReservationResponse>(`/api/v1/sales/${campaignId}/reserve`, {
      method: 'POST',
      headers: {
        'idempotency-key': key,
      },
      body: JSON.stringify({ quantity }),
    });
  }

  async getReservation(id: string): Promise<ReservationResponse> {
    return this.request<ReservationResponse>(`/api/v1/reservations/${id}`);
  }

  async getMyReservations(query?: UserReservationsQuery): Promise<PaginatedResponse<UserReservationItem>> {
    const params = new URLSearchParams();
    if (query?.status) params.set('status', query.status);
    if (query?.page) params.set('page', query.page.toString());
    if (query?.limit) params.set('limit', query.limit.toString());
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<PaginatedResponse<UserReservationItem>>(`/api/v1/users/me/reservations${qs}`);
  }

  // =================== CHECKOUT & PAYMENT ===================

  async checkout(reservationId: string, paymentToken: string): Promise<CheckoutResponse> {
    return this.request<CheckoutResponse>(`/api/v1/checkout/${reservationId}/pay`, {
      method: 'POST',
      body: JSON.stringify({ paymentToken }),
    });
  }

  // =================== ADMIN OPERATIONS ===================

  async getDashboardSummary(): Promise<AdminDashboardSummary> {
    return this.request<AdminDashboardSummary>('/api/v1/admin/dashboard/summary');
  }

  async getAdminCampaigns(query?: ListCampaignsQuery): Promise<PaginatedResponse<CampaignResponse>> {
    const params = new URLSearchParams();
    if (query?.status) params.set('status', query.status);
    if (query?.search) params.set('search', query.search);
    if (query?.page) params.set('page', query.page.toString());
    if (query?.limit) params.set('limit', query.limit.toString());
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<PaginatedResponse<CampaignResponse>>(`/api/v1/admin/campaigns${qs}`);
  }

  async getAdminCampaign(id: string): Promise<CampaignResponse> {
    return this.request<CampaignResponse>(`/api/v1/admin/campaigns/${id}`);
  }

  async createCampaign(data: CreateCampaignInput): Promise<CampaignResponse> {
    return this.request<CampaignResponse>('/api/v1/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async activateCampaign(id: string): Promise<CampaignResponse> {
    return this.request<CampaignResponse>(`/api/v1/campaigns/${id}/activate`, {
      method: 'POST',
    });
  }

  async deactivateCampaign(id: string): Promise<CampaignResponse> {
    return this.request<CampaignResponse>(`/api/v1/campaigns/${id}/deactivate`, {
      method: 'POST',
    });
  }

  async getCampaignInventoryAudit(campaignId: string): Promise<AdminCampaignInventory> {
    return this.request<AdminCampaignInventory>(`/api/v1/admin/campaigns/${campaignId}/inventory`);
  }

  async getAdminReservations(query?: AdminReservationsQuery): Promise<PaginatedResponse<AdminReservationDetail>> {
    const params = new URLSearchParams();
    if (query?.status) params.set('status', query.status);
    if (query?.search) params.set('search', query.search);
    if (query?.campaignId) params.set('campaignId', query.campaignId);
    if (query?.userId) params.set('userId', query.userId);
    if (query?.page) params.set('page', query.page.toString());
    if (query?.limit) params.set('limit', query.limit.toString());
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<PaginatedResponse<AdminReservationDetail>>(`/api/v1/admin/reservations${qs}`);
  }

  async getAdminReservation(id: string): Promise<AdminReservationDetail> {
    return this.request<AdminReservationDetail>(`/api/v1/admin/reservations/${id}`);
  }

  async getAdminMetricsSummary(): Promise<AdminMetricsSummary> {
    return this.request<AdminMetricsSummary>('/api/v1/admin/metrics/summary');
  }

  // =================== HEALTH & METRICS ===================

  async getHealthLive(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/health/live');
  }

  async getHealthReady(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/health/ready');
  }
}

export const api = new ApiClient();
