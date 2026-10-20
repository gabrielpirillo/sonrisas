'use client';
import { MotionConfig } from 'framer-motion';

/** Las animaciones de framer-motion de la consola (KPIs, gráfico, editor) respetan «reducir movimiento». */
export function MotionPrefs({ children }: { children: React.ReactNode }) {
    return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
