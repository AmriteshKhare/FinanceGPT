import { z } from 'zod';

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.string(),
  timestamp: z.string().datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const readyResponseSchema = z.object({
  status: z.enum(['ready', 'not_ready']),
  database: z.enum(['up', 'down']),
  timestamp: z.string().datetime(),
});

export type ReadyResponse = z.infer<typeof readyResponseSchema>;

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const userPublicSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  householdId: z.string().uuid(),
  householdName: z.string(),
  role: z.enum(['owner', 'admin', 'member']),
});

export type UserPublic = z.infer<typeof userPublicSchema>;

export const authMeResponseSchema = z.object({
  user: userPublicSchema,
});

export type AuthMeResponse = z.infer<typeof authMeResponseSchema>;

export const loginResponseSchema = z.object({
  user: userPublicSchema,
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const logoutResponseSchema = z.object({
  ok: z.literal(true),
});

export type LogoutResponse = z.infer<typeof logoutResponseSchema>;
