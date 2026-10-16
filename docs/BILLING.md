# Billing — Créditos prepago (Stripe + Flexprice)

Sistema de cobro por uso para Smile Forward. Cada generación consume créditos
prepago de la clínica. **Imagen = 1 crédito, video = 4 créditos** (configurable).

## Arquitectura

```
                 ┌──────────────────────────────────────────┐
   Widget /      │  Next.js (esta app)                       │
   Admin         │                                           │
     │           │  /api/ai/smile ──┐                        │
     │ genera    │  /api/ai/video ──┤ reserve()  (atómico)   │
     ▼           │                  ├─ confirm() (éxito)      │
  ┌─────────┐    │                  └─ refund()  (fallo)      │
  │ clínica │    │         lib/billing/credits.ts            │
  │ (tenant)│    │                  │            │            │
  └─────────┘    └──────────────────┼────────────┼───────────┘
                                     │            │
                         ledger local│            │eventos de uso
                         (FUENTE DE  │            │(best-effort)
                          VERDAD)    ▼            ▼
                            Postgres        Flexprice (self-host)
                            clinics.credit_balance   metering + invoicing
                                     ▲
                          recarga    │ topUp()
                                     │
                            Stripe Checkout ──► webhook /api/billing/stripe-webhook
```

- **Ledger local (Postgres)** = fuente de verdad para el *gating*. El débito es
  atómico (`debit_credits()` con `WHERE credit_balance >= cost`), así que nunca
  se sobrevende aún con generaciones concurrentes. No depende de Flexprice.
- **Flexprice** = sistema de registro de *metering* e *invoicing*. Recibe un
  evento de uso por cada generación exitosa (best-effort; si está caído, el
  gating sigue funcionando y se reconcilia luego).
- **Stripe** = pasarela de recarga. Checkout propio → webhook → `topUp()` suma
  créditos al balance local y al wallet de Flexprice.

### Ciclo de vida de una generación

1. `reserve()` descuenta créditos al iniciar (bloquea con HTTP 402 si no hay).
2. Éxito → `confirm()` registra el evento de uso en Flexprice.
3. Fallo → `refund()` devuelve los créditos (idempotente).

Todo es idempotente vía `credit_ledger.idempotency_key`
(`image:<uuid>`, `video:<generation_id>`, `refund:<key>`, `stripe:<session_id>`,
`usage:<key>`).

## Modelo de datos (migración `002_credits_and_billing.sql`)

- `clinics` — tenant. `credit_balance`, `public_widget_key`, `stripe_customer_id`,
  `flexprice_customer_id`, `flexprice_wallet_id`.
- `clinic_id` en `users`, `leads`, `generations`.
- `credit_costs(action, credits)` — precio por acción (seed: image=1, video=4).
- `credit_ledger` — historial append-only de todo movimiento.
- Funciones `debit_credits()` / `credit_credits()` — mutaciones atómicas.

## Puesta en marcha

### 1. Aplicar la migración

```bash
psql "$DATABASE_URL" -f migrations/002_credits_and_billing.sql
```

Crea una clínica `default` y migra los datos existentes a ella. Obtén su clave:

```sql
SELECT slug, public_widget_key, credit_balance FROM clinics;
```

Pon esa clave en `DEFAULT_CLINIC_KEY` (y `NEXT_PUBLIC_CLINIC_KEY` si quieres que
el widget la envíe explícitamente).

### 2. Stripe

1. Crea 3 **Products** con **Price one-time** (50 / 200 / 1000 créditos). Pon los
   `price_...` en `STRIPE_PRICE_STARTER|GROWTH|PRO`.
   - Precio sugerido (margen ~4×): 50 → $45, 200 → $160, 1000 → $700. Ajusta a tu margen.

   > **Ya creados en la cuenta Stripe `Brandboost` (modo LIVE, USD):**
   > | Paquete | Créditos | Precio | `STRIPE_PRICE_*` |
   > |---|---|---|---|
   > | `starter` | 50 | $45 | `price_1ThsM3CUaVGaMCKZWs7ivJBC` |
   > | `growth` | 200 | $160 | `price_1ThsMMCUaVGaMCKZRczfZjBg` |
   > | `pro` | 1000 | $700 | `price_1ThsMaCUaVGaMCKZOx3uGUMX` |

2. Crea un **webhook endpoint** apuntando a
   `https://<tu-dominio>/api/billing/stripe-webhook`, evento
   `checkout.session.completed`. Copia el signing secret a `STRIPE_WEBHOOK_SECRET`.
3. Pon `STRIPE_SECRET_KEY`.

Comprar créditos (admin): `POST /api/billing/checkout { "package_id": "growth" }`
→ devuelve `url` de Checkout. Al pagar, el webhook recarga el balance.

### 3. Flexprice (self-host en Easypanel)

Ver `deploy/flexprice/README.md`. Una vez arriba:

1. Crea una API key en Flexprice → `FLEXPRICE_API_KEY`.
2. Pon la URL interna en `FLEXPRICE_API_URL` (p. ej. `http://flexprice-api:8080`).
3. Crea los **meters/eventos** `image_generation` y `video_generation` y, si
   quieres facturación por uso, sus precios/planes. La app provisiona el
   customer y el wallet de cada clínica de forma perezosa (lazy) en el primer
   evento/recarga.

> Flexprice es **opcional para operar**: si `FLEXPRICE_API_URL`/`_API_KEY` no
> están configuradas, el cobro por créditos funciona igual (solo no se envían
> eventos de metering).

## Ajustar precios de créditos

```sql
UPDATE credit_costs SET credits = 2 WHERE action = 'image';
UPDATE credit_costs SET credits = 5 WHERE action = 'video';
```

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/billing/checkout` | Crea sesión de Stripe Checkout (admin). |
| `POST` | `/api/billing/stripe-webhook` | Recarga créditos al pagar. |
| `GET`  | `/api/billing/balance` | Balance + costos + ledger reciente (admin). |

Las rutas de IA (`/api/ai/smile`, `/api/ai/video/generate`) devuelven
**HTTP 402** con `code: "INSUFFICIENT_CREDITS"` cuando no hay saldo.
