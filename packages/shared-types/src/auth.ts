export type UserRole = "user" | "admin";
export interface LoginRequest {
  email: string;
  password: string;
}
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}
export interface LoginResponse {
  token: string;
  user: AuthUser;
}
