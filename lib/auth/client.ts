/**
 * Better Auth — cliente para el navegador (React).
 * Incluye el plugin de organization para gestionar clínicas, miembros e invitaciones.
 */
'use client';

import { createAuthClient } from 'better-auth/react';
import { organizationClient, adminClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
    basePath: '/api/better-auth',
    plugins: [organizationClient(), adminClient()],
});

export const {
    signIn,
    signUp,
    signOut,
    useSession,
    organization,
    admin,
    useListOrganizations,
    useActiveOrganization,
} = authClient;
