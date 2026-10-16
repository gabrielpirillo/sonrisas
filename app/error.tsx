'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: 24 }}>
            <div className="sf-rise" style={{ maxWidth: 440, width: '100%', textAlign: 'center', background: '#fff', border: '1px solid var(--blue-line)', borderRadius: 24, padding: '36px 28px', boxShadow: '0 30px 60px -36px rgba(27,38,48,0.45)' }}>
                <span style={{ width: 52, height: 52, borderRadius: 16, display: 'inline-grid', placeItems: 'center', background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                    <AlertTriangle size={22} />
                </span>
                <h2 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em', margin: '18px 0 8px', color: 'var(--ink)' }}>Algo salió mal</h2>
                <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--ink-2)', margin: 0 }}>
                    Ocurrió un error inesperado. Vuelve a intentarlo; si persiste, recarga la página.
                </p>
                {error.digest && (
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', color: 'var(--ink-3)', margin: '14px 0 0' }}>ID: {error.digest}</p>
                )}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
                    <button onClick={() => reset()} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 999, border: 0, background: 'var(--blue-deep)', color: '#fff', fontWeight: 600, fontSize: 14.5, cursor: 'pointer' }}>
                        <RotateCcw size={15} /> Reintentar
                    </button>
                    <button onClick={() => window.location.reload()} style={{ padding: '12px 20px', borderRadius: 999, border: '1px solid var(--blue-line)', background: '#fff', color: 'var(--blue-deep)', fontWeight: 600, fontSize: 14.5, cursor: 'pointer' }}>
                        Recargar
                    </button>
                </div>
            </div>
        </div>
    )
}
