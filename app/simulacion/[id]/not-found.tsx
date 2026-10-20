import { Wordmark } from '@/components/admin/qoves/LogoMark'

/**
 * Enlace de vídeo inexistente o caducado. Lo abre un paciente (no una
 * clínica), así que no le mandamos a la landing ni a la demo: solo le
 * explicamos qué pasó y que su clínica puede reenviárselo.
 */
export default function SimulacionNotFound() {
  return (
    <>
      <style>{`
        body { background-color: #131b22; }
        .sf-sim-nf {
          min-height: 100vh; min-height: 100dvh;
          display: flex; flex-direction: column; align-items: center;
          padding: max(20px, env(safe-area-inset-top, 0px)) 20px max(24px, env(safe-area-inset-bottom, 0px));
          color: #fff; text-align: center;
          font-family: var(--font-general-sans), "Helvetica Neue", Arial, sans-serif;
          background:
            radial-gradient(60% 50% at 50% 0%, rgba(158, 186, 204, 0.22), transparent 70%),
            radial-gradient(90% 140% at 12% 0%, var(--navy-1, #2a3a47) 0%, var(--navy-2, #1b2630) 55%, var(--navy-3, #131b22) 100%);
          -webkit-font-smoothing: antialiased;
        }
        .sf-sim-nf-card {
          margin: auto 0; max-width: 380px; width: 100%;
          padding: 28px 22px; border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.14); background: rgba(255, 255, 255, 0.05);
          animation: sf-rise 0.6s var(--ease-out, ease) both;
        }
        .sf-sim-nf-ic {
          width: 56px; height: 56px; margin: 0 auto 16px; border-radius: 50%;
          display: grid; place-items: center;
          border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(255, 255, 255, 0.08);
        }
        .sf-sim-nf h1 { margin: 0 0 10px; font-size: 24px; font-weight: 600; letter-spacing: -0.03em; line-height: 1.15; text-wrap: balance; }
        .sf-sim-nf p { margin: 0; color: rgba(255, 255, 255, 0.72); font-size: 15px; line-height: 1.55; }
        .sf-sim-nf-mono {
          font-family: var(--font-jetbrains), ui-monospace, "SF Mono", Menlo, monospace;
          text-transform: uppercase; letter-spacing: 0.18em; font-size: 10px; color: rgba(255, 255, 255, 0.45);
        }
        @media (prefers-reduced-motion: reduce) { .sf-sim-nf-card { animation: none; } }
      `}</style>
      <main className="sf-sim-nf">
        <Wordmark tone="light" height={20} />
        <div className="sf-sim-nf-card">
          <div className="sf-sim-nf-ic" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="6" width="13" height="12" rx="2.5" />
              <path d="M16 10.5l5-3v9l-5-3" />
              <path d="M3 3l18 18" />
            </svg>
          </div>
          <h1>Esta simulación no está disponible</h1>
          <p>El enlace no es correcto o ya caducó. Pide a tu clínica que te lo vuelva a enviar.</p>
        </div>
        <span className="sf-sim-nf-mono">Simulación de sonrisa · Smile Fast</span>
      </main>
    </>
  )
}
