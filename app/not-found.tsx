import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Wordmark } from '@/components/admin/qoves/LogoMark';

export default function NotFound() {
    return (
        <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: 'radial-gradient(60% 50% at 50% 0%, var(--blue-tint), #fff 70%)' }}>
            <div className="sf-stagger" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, maxWidth: 480 }}>
                <Wordmark height={24} />
                <div style={{ fontSize: 'clamp(84px, 16vw, 140px)', fontWeight: 600, letterSpacing: '-0.06em', lineHeight: 1, background: 'linear-gradient(160deg, var(--blue-accent), var(--navy-2))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                    404
                </div>
                <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em', margin: 0 }}>Esta página no existe</h1>
                <p style={{ fontSize: 15.5, color: 'var(--ink-2)', margin: 0, lineHeight: 1.55 }}>Puede que el enlace haya cambiado o ya no esté disponible.</p>
                <Link href="/" style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 999, background: 'linear-gradient(135deg, var(--blue-deep), var(--blue-ink))', color: '#fff', fontWeight: 600, fontSize: 14.5, textDecoration: 'none' }}>
                    <ArrowLeft size={15} /> Volver al inicio
                </Link>
            </div>
        </div>
    );
}
