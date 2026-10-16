# Flexprice self-host — runbook (verificado con la doc oficial)

[Flexprice](https://github.com/flexprice/flexprice) es la plataforma open-source
de billing por uso que usamos (opcionalmente) como sistema de metering e
invoicing. El cobro por créditos de Smile Forward **funciona sin Flexprice**
(el ledger en Postgres es la fuente de verdad); Flexprice solo añade metering,
facturas y modelos de precio avanzados.

> ⚠️ Flexprice **no publica imagen Docker**: se construye desde fuente y las
> migraciones son targets de `make`. Por eso el camino fiable es una **VM/servidor
> con Docker + make** (no la API de Easypanel a ciegas). Su stack incluye
> PostgreSQL, Kafka, ClickHouse y Temporal.

## 0. Despliegue en Easypanel desde el repo (VERIFICADO — lo que realmente funcionó)

Se desplegó Flexprice **construyendo la imagen desde el repo de GitHub** en el
proyecto `dentalflow`, como 7 servicios: `flexprice-pg` (postgres:17),
`flexprice-kafka` (confluentinc/cp-kafka:7.7.1), `flexprice-ch`
(clickhouse/clickhouse-server:24.9-alpine), `flexprice-temporal`
(temporalio/auto-setup:1.26.2), y `flexprice-api` / `flexprice-consumer` /
`flexprice-worker` (build Dockerfile del repo, distinto `FLEXPRICE_DEPLOYMENT_MODE`).

Trampas resueltas (imprescindibles en Easypanel):

1. **Kafka no puede bindear a su DNS de servicio.** `KAFKA_LISTENERS` debe usar
   `0.0.0.0` (no el hostname): `INTERNAL://0.0.0.0:9092,EXTERNAL://0.0.0.0:29092,CONTROLLER://0.0.0.0:9093`.
   Los `KAFKA_ADVERTISED_LISTENERS` sí van con el nombre DNS (`flexprice-kafka:9092`).
   `KAFKA_AUTO_CREATE_TOPICS_ENABLE=true` evita crear los topics a mano.
2. **RBAC busca `internal/config/rbac/roles.json` (ruta relativa)** pero la imagen
   copia `internal/config` a `/app/config`. Arranque con symlink:
   `command: sh -c 'mkdir -p /app/internal && ln -sfn /app/config /app/internal/config && exec ./server'`.
3. **Postgres:** `FLEXPRICE_POSTGRES_AUTO_MIGRATE=true` corre las migraciones Ent
   al arrancar la API. Crea antes la extensión: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;`.
4. **Seed del tenant:** correr `migrations/postgres/V1__seed.sql` (crea el tenant
   `00000000-…` + environments Sandbox/Production). Sin esto, la auth falla.
5. **ClickHouse:** sus tablas NO se migran solas. Aplicar `migrations/clickhouse/*.sql`
   con `clickhouse-client --multiquery` (si no, ingieres eventos con 202 pero no persisten).
6. **API keys = SHA-256.** El mapa `auth.api_key.keys` se indexa por
   `sha256(raw_key)`. Genera `RAW` y pon `sha256(RAW)` como clave:
   `FLEXPRICE_AUTH_API_KEY_KEYS={"<sha256>":{"tenant_id":"00000000-0000-0000-0000-000000000000","user_id":"00000000-0000-0000-0000-000000000000","name":"prod","is_active":true}}`
   (este env SÍ se parsea como JSON). La app envía la `RAW`.
7. **`X-Environment-ID` obligatorio.** Todas las llamadas deben incluir el header
   con el environment (p. ej. Production `00000000-0000-0000-0000-000000000001`),
   o los eventos no persisten. El cliente de la app lo envía vía `FLEXPRICE_ENVIRONMENT_ID`.
8. **Seguridad:** `flexprice-api` se deja **sin dominio público** (solo red interna);
   `smile_forward` lo consume en `http://flexprice-api:8080/v1`.

## 1. Alternativa: desplegar Flexprice (VM con Docker + make)

Opción rápida (todo en uno):
```bash
git clone https://github.com/flexprice/flexprice.git
cd flexprice
make dev-setup          # levanta infra, construye imagen, init-db, migraciones, seed, y arranca api/consumer/worker
# API disponible en http://<host>:8080  · API key de prueba sembrada: sk_local_flexprice_test_key
```

Opción manual (más control):
```bash
docker compose up -d    # Postgres, Kafka, ClickHouse, Temporal
make build-image        # construye la imagen de la app de Flexprice
make init-db            # inicializa bases de datos
make migrate-ent        # migraciones (entidades)
make seed-db            # tenant + datos por defecto (genera la API key sk_local_...)
make start-flexprice    # arranca API (8080), consumer (Kafka) y worker (Temporal)
```

Variante de migraciones por componente (si lo necesitas):
`make migrate-postgres`, `make migrate-local` (Ent), `make migrate-clickhouse`, y
crear los topics de Kafka antes de arrancar el consumer.

## 2. Producción: API key real

`sk_local_flexprice_test_key` es solo para desarrollo. Para producción crea un
tenant + entorno + **API key** propios (desde la UI de Flexprice o su API de
auth) y usa esa key. La autenticación es por header **`x-api-key`**.

## 3. Crear los meters de uso

En Flexprice crea dos **meters/eventos** (event_name) que la app emite:
- `image_generation`
- `video_generation`

Si quieres que Flexprice **facture/descuente** además del ledger local, crea un
precio usage-based ligado a cada meter y un wallet de crédito por cliente. Si solo
quieres **reporting/metering**, basta con los meters (el cobro real lo sigue
haciendo el ledger local de la app).

## 4. Conectar la app

En el servicio `smile_forward` (Easypanel → env). **El path incluye `/v1`:**
```
FLEXPRICE_API_URL=http://<host-flexprice>:8080/v1   # o https://api.flexprice.io/v1 (cloud)
FLEXPRICE_API_KEY=<tu api key>
```
Redespliega la app. A partir de ahí:
- La app **auto-provisiona** un *customer* (`external_id` = id de la clínica) y un
  *wallet* (currency USD, conversion_rate 1 → 1 crédito = 1 unidad) en el primer
  evento/recarga, y guarda `flexprice_customer_id` / `flexprice_wallet_id` en
  `clinics`.
- Cada generación exitosa envía un evento (`POST /events`,
  `event_name` + `external_customer_id`).
- Cada compra de créditos (Stripe) hace `POST /wallets/{id}/top-up`
  (`transaction_reason: PURCHASED_CREDIT_DIRECT`, `credits_to_add`, `idempotency_key`).

## 5. Verificar

- `GET http://<host>:8080/v1/customers/wallets?id=<clinic_id>&include_real_time_balance=true`
  con header `x-api-key` → debe listar el wallet de la clínica.
- Genera una imagen en el widget → aparece un evento `image_generation`.
- Compra un paquete → el wallet refleja el top-up.

## Endpoints usados por la app (verificados contra la API reference)

| Acción | Método / ruta | Notas |
|---|---|---|
| Crear customer | `POST /customers` | `external_id` = clinic id |
| Crear wallet | `POST /wallets` | `external_customer_id`, `currency`, `conversion_rate` |
| Recargar | `POST /wallets/{id}/top-up` | `transaction_reason`, `credits_to_add`, `idempotency_key` |
| Evento de uso | `POST /events` | `event_name`, `external_customer_id`, `properties` |
| Balance | `GET /customers/wallets?id=…&include_real_time_balance=true` | array de wallets |

Auth: header `x-api-key: <FLEXPRICE_API_KEY>` en todas.
