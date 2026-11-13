import type {
  AdminCampaignInventory,
  AdminDashboardSummary,
  AdminMetricsSummary,
  AdminReservationDetail,
  AdminReservationsQuery,
  CampaignResponse,
  CheckoutResponse,
  ListCampaignsQuery,
  LoginInput,
  LoginResponse,
  PaginatedResponse,
  RegisterInput,
  ReservationResponse,
  UserReservationItem,
  UserReservationsQuery,
} from '@flashreserve/shared-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Auth APIs
  async register(data: RegisterInput): Promise<LoginResponse> {
    return this.request<LoginResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginInput): Promise<LoginResponse> {
    return this.request<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe() {
    return this.request('/api/v1/auth/me');
  }

  // Campaign APIs
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

  // Reservation APIs (Hot Path)
  async reserve(campaignId: string, quantity: number, idempotencyKey: string): Promise<ReservationResponse> {
    return this.request<ReservationResponse>(`/api/v1/sales/${campaignId}/reserve`, {
      method: 'POST',
      headers: {
        'idempotency-key': idempotencyKey,
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

  // Checkout API
  async checkout(reservationId: string, paymentToken: string): Promise<CheckoutResponse> {
    return this.request<CheckoutResponse>(`/api/v1/checkout/${reservationId}/pay`, {
      method: 'POST',
      body: JSON.stringify({ paymentToken }),
    });
  }

  // Admin APIs
  async getDashboardSummary(): Promise<AdminDashboardSummary> {
    return this.request<AdminDashboardSummary>('/api/v1/admin/dashboard/summary');
  }

  async getAdminCampaigns(query?: ListCampaignsQuery): Promise<PaginatedResponse<CampaignResponse>> {
    const params = new URLSearchParams();
    if (query?.status) params.set('status', query.status);
    if (query?.search) params.set('search', query.search);
    if (query?.page) params.set('page', query.page.toString());
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<PaginatedResponse<CampaignResponse>>(`/api/v1/admin/campaigns${qs}`);
  }

  async getCampaignInventoryAudit(campaignId: string): Promise<AdminCampaignInventory> {
    return this.request<AdminCampaignInventory>(`/api/v1/admin/campaigns/${campaignId}/inventory`);
  }

  async getAdminReservations(query?: AdminReservationsQuery): Promise<PaginatedResponse<AdminReservationDetail>> {
    const params = new URLSearchParams();
    if (query?.status) params.set('status', query.status);
    if (query?.search) params.set('search', query.search);
    if (query?.page) params.set('page', query.page.toString());
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<PaginatedResponse<AdminReservationDetail>>(`/api/v1/admin/reservations${qs}`);
  }

  async getAdminMetricsSummary(): Promise<AdminMetricsSummary> {
    return this.request<AdminMetricsSummary>('/api/v1/admin/metrics/summary');
  }
}

export const api = new ApiClient();

