/**
 * Better Auth — handler de todas las rutas de auth (login, signup, session, org…).
 * Montado en /api/better-auth para convivir con NextAuth durante el rollout.
 */
import { auth } from '@/lib/auth/better';
import { toNextJsHandler } from 'better-auth/next-js';

export const { GET, POST } = toNextJsHandler(auth);
