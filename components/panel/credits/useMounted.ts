'use client';
import { useSyncExternalStore } from 'react';

const noop = () => () => {};

/** false en el servidor y durante la hidratación; true después (sin setState en efectos). */
export function useMounted(): boolean {
    return useSyncExternalStore(noop, () => true, () => false);
}
