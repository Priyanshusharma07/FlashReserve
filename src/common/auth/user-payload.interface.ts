export interface AuthenticatedUser {
  userId: string;
  role: 'user' | 'admin';
  email?: string;
  metadata?: Record<string, unknown>;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
    correlationId?: string;
  }
}
