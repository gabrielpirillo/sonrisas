// app/simulacion/[id]/page.tsx
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { Wordmark } from '@/components/admin/qoves/LogoMark'
import { BRAND_NAME } from '@/lib/brand'

export default async function SimulacionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const lead = await db.queryOne(
    'SELECT name, video_path FROM leads WHERE id = $1',
    [id]
  );

  if (!lead?.video_path) return notFound()

  const videoSrc = `/api/video/${id}`
  const firstName = typeof lead.name === 'string' ? lead.name.trim().split(/\s+/)[0] : ''

  return (
    <>
      <style>{`
        body { background-color: #131b22; }

        .sf-sim, .sf-sim * { box-sizing: border-box; }

        .sf-sim {
          position: relative;
          min-height: 100vh;
          min-height: 100dvh;
          overflow: hidden;
          color: #fff;
          font-family: var(--font-general-sans), "Helvetica Neue", Arial, sans-serif;
          background:
            radial-gradient(60% 50% at 50% 0%, rgba(158, 186, 204, 0.22), transparent 70%),
            radial-gradient(45% 60% at 100% 100%, rgba(142, 164, 180, 0.16), transparent 70%),
            radial-gradient(90% 140% at 12% 0%, var(--navy-1, #2a3a47) 0%, var(--navy-2, #1b2630) 55%, var(--navy-3, #131b22) 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px 16px 28px;
          -webkit-font-smoothing: antialiased;
        }

        .sf-sim-top {
          width: 100%;
          max-width: 900px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          animation: sf-fade 0.6s var(--ease-out, ease) both;
        }

        .sf-mono {
          font-family: var(--font-jetbrains), ui-monospace, "SF Mono", Menlo, monospace;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-weight: 500;
          font-size: 9.5px;
        }

        .sf-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 13px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.82);
          white-space: nowrap;
        }

        .sf-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--scan, #06b6d4);
          box-shadow: 0 0 8px var(--scan, #06b6d4);
          animation: sf-glow 1.8s ease-in-out infinite;
        }

        .sf-sim-head {
          text-align: center;
          margin: 34px 0 22px;
          animation: sf-rise 0.7s var(--ease-out, ease) 0.05s both;
        }

        .sf-sim-title {
          margin: 16px 0 0;
          font-size: clamp(32px, 6vw, 54px);
          font-weight: 600;
          letter-spacing: -0.035em;
          line-height: 1.02;
        }

        .sf-sim-title span {
          background: linear-gradient(90deg, #ffffff, var(--blue-light, #b9cfdd));
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }

        .sf-sim-sub {
          margin: 12px auto 0;
          max-width: 460px;
          color: rgba(255, 255, 255, 0.7);
          font-size: clamp(14px, 2vw, 16px);
          line-height: 1.5;
        }

        .sf-video {
          position: relative;
          width: 100%;
          max-width: 900px;
          height: 68vh;
          height: 68dvh;
          border-radius: 24px;
          overflow: hidden;
          background: #0e151b;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 40px 90px -40px rgba(0, 0, 0, 0.75);
          animation: sf-pop 0.8s var(--ease-out, ease) 0.15s both;
        }

        .sf-video video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
          background: #0e151b;
        }

        .sf-corner {
          position: absolute; width: 22px; height: 22px; z-index: 2; pointer-events: none;
          border: 0 solid rgba(6, 182, 212, 0.8);
        }
        .sf-corner.tl { top: 14px; left: 14px; border-top-width: 2px; border-left-width: 2px; border-top-left-radius: 7px; }
        .sf-corner.tr { top: 14px; right: 14px; border-top-width: 2px; border-right-width: 2px; border-top-right-radius: 7px; }

        .sf-sim-cta {
          margin-top: 26px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          animation: sf-rise 0.7s var(--ease-out, ease) 0.3s both;
        }

        .cta-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 17px 34px;
          background: #fff;
          color: var(--navy-2, #1b2630);
          text-decoration: none;
          border-radius: 999px;
          font-weight: 500;
          font-size: 16px;
          letter-spacing: -0.01em;
          white-space: nowrap;
          box-shadow: 0 18px 40px -18px rgba(0, 0, 0, 0.6);
          transition: transform 0.3s var(--ease-out, ease), box-shadow 0.3s ease, background 0.25s ease;
        }

        .cta-button:hover {
          transform: translateY(-2px);
          background: var(--blue-tint, #f2f6f9);
          box-shadow: 0 24px 50px -18px rgba(6, 182, 212, 0.45);
        }

        .cta-button:active { transform: scale(0.985); }
        .cta-button:focus-visible { outline: none; box-shadow: 0 0 0 4px rgba(185, 207, 221, 0.45); }

        .cta-arrow { transition: transform 0.3s var(--ease-out, ease); }
        .cta-button:hover .cta-arrow { transform: translateX(4px); }

        .sf-note { color: rgba(255, 255, 255, 0.45); }

        @media (max-width: 600px) {
          .sf-sim { padding: 16px 12px 22px; }
          .sf-sim-head { margin: 26px 0 18px; }
          .sf-video { height: 62vh; height: 62dvh; border-radius: 20px; }
          .sf-sim-cta { width: 100%; }
          .cta-button { width: 100%; }
        }

        @media (prefers-reduced-motion: reduce) {
          .sf-sim *, .sf-sim-top, .sf-sim-head, .sf-video, .sf-sim-cta { animation: none !important; transition: none !important; }
        }
      `}</style>

      <main className="sf-sim">
        <div className="sf-sim-top">
          <Wordmark tone="light" height={20} />
          <span className="sf-mono sf-pill"><span className="sf-dot" />Simulación en vídeo</span>
        </div>

        <div className="sf-sim-head">
          <span className="sf-mono sf-note">{BRAND_NAME} · tu resultado</span>
          <h1 className="sf-sim-title">
            {firstName ? <>{firstName}, esta es <span>tu nueva sonrisa</span></> : <>Tu <span>nueva sonrisa</span></>}
          </h1>
          {lead.name && (
            <p className="sf-sim-sub">Simulación de {lead.name}</p>
          )}
        </div>

        <div className="sf-video">
          <span className="sf-corner tl" aria-hidden="true" />
          <span className="sf-corner tr" aria-hidden="true" />
          <video
            controls
            autoPlay
            playsInline
            src={videoSrc}
          />
        </div>

        <div className="sf-sim-cta">
          <a
            href="https://dentalcorbella.com/contacto"
            className="cta-button"
          >
            Reservar mi cita
            <svg className="cta-arrow" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
          <span className="sf-mono sf-note">Simulación orientativa · según tu caso clínico</span>
        </div>
      </main>
    </>
  )
}
