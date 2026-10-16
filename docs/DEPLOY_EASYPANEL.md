# DEPLOY_CLAUDE.md — Runbook de despliegue autónomo (Smile Forward → Easypanel)

> **Para Claude Code.** Este archivo es autosuficiente. Léelo completo y ejecútalo de
> principio a fin para desplegar **Smile Forward** (app Next.js + PostgreSQL + MinIO) en
> **Easypanel**, actuando como un ingeniero DevOps/full-stack experto.
>
> **Regla de oro de interacción:** trabaja de forma autónoma. **Solo** detente a preguntar
> al usuario cuando necesites un **secreto externo / API key** que no puedes generar tú
> (lista en §1). Todo lo demás —contraseñas internas, llaves de MinIO, `NEXTAUTH_SECRET`,
> URLs derivadas, orden de los pasos— lo decides y generas tú. Agrupa las preguntas en
> **una sola tanda al inicio**; no preguntes de a una.

> **Regla de flujo de trabajo (Git):** **siempre que realices cambios en el código,
> después de commitearlos debes hacer push a la rama `main`.** Es decir, todo cambio
> terminado se publica en `main` (commit → push a `main`), salvo que el usuario indique
> explícitamente otra rama en ese momento.

---

## 0. Objetivo y barreras

- **Meta:** dejar Smile Forward **100 % funcional** en Easypanel, con todos sus servicios
  y variables de entorno, en un proyecto **aislado y nuevo** (no toca producción).
- **NO toques** el proyecto Easypanel existente llamado `smile_forward` (es producción).
  Crea un proyecto nuevo (por defecto **`smileforward-copia`**).
- **Repo de origen del deploy:** `https://github.com/aortiz13/smileforward-copia` (rama `main`).
  Si el usuario indica otro, úsalo.
- **Aislamiento total:** este deploy genera su **propia** base de datos y su **propio**
  MinIO con credenciales nuevas. Nunca reutilices secretos de producción.
- **Idempotencia:** antes de crear algo, lista lo existente (`projects.listProjectsAndServices`)
  y omite/actualiza si ya existe. Si un paso falla, diagnostica y reintenta; no dejes el
  deploy a medias.

---

## 1. Lo ÚNICO que debes preguntar al usuario (una sola tanda)

Haz estas preguntas juntas, al inicio. Si el usuario ya te dio el dato, no lo vuelvas a pedir.

1. **Easypanel — URL del panel.** Por defecto `https://panel.brandboost-ai.com`. Confírmala.
2. **Easypanel — API token** (Bearer). **Obligatorio.** Sin esto no puedes hacer nada.
3. **`GOOGLE_API_KEY`** — clave de Google Gemini/Veo (la app falla sin ella).
4. **Dominio público de la app** — p. ej. `https://copia.midominio.com`.
   - Si el usuario **no tiene** dominio propio, dile que usarás el dominio auto-generado
     de Easypanel (`*.easypanel.host`) y continúa; ajustarás `NEXTAUTH_URL` a esa URL.
5. **SMTP (opcional)** — `SMTP_HOSTNAME`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`,
   `CLINIC_NOTIFICATION_EMAIL`. Si el usuario no los da, **deja el envío de correo sin
   configurar** (la app arranca igual; solo no enviará emails) y avísale.
6. **Credenciales del admin inicial** — email y contraseña para el primer usuario que podrá
   entrar a `/administracion`. Si no las da, propón un email y **genera** una contraseña
   aleatoria fuerte y muéstrasela una sola vez al final.

> **Nunca** inventes ni adivines estos valores (salvo la contraseña del admin, que sí puedes
> generar). Todo lo demás de §2 lo generas tú sin preguntar.

---

## 2. Secretos y valores que generas TÚ (no preguntar)

Genera con un CSPRNG y guárdalos en memoria para usarlos en los `env` de cada servicio:

| Variable | Cómo generarla |
|---|---|
| `POSTGRES_PASSWORD` | 24+ chars aleatorios sin caracteres problemáticos para URLs (`A–Z a–z 0–9`) |
| `MINIO_ROOT_USER` | p. ej. `sfcopia-admin` |
| `MINIO_ROOT_PASSWORD` | 32 chars aleatorios |
| `MINIO_ACCESS_KEY` | 20 chars aleatorios (puede ser = `MINIO_ROOT_USER` o uno dedicado) |
| `MINIO_SECRET_KEY` | 40 chars aleatorios (puede ser = `MINIO_ROOT_PASSWORD`) |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` (44 chars) |

Comando de referencia (Node, ya disponible en el repo):
```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

**Valores derivados** (los calculas, no se preguntan). Sea `P` el nombre del proyecto
(`smileforward-copia`):

| Variable | Valor |
|---|---|
| `DATABASE_URL` | `postgres://postgres:<POSTGRES_PASSWORD>@<P>_smileforward-db:5432/smile_forward?sslmode=disable` |
| `MINIO_ENDPOINT` | `http://minio:9000` (forma CORTA — ver aviso de DNS abajo) |
| `MINIO_PUBLIC_URL` | URL pública del servicio MinIO (dominio asignado en §4.3) |
| `NEXT_PUBLIC_STORAGE_URL` | = `MINIO_PUBLIC_URL` |
| `NEXTAUTH_URL` | dominio público de la app (pregunta §1.4) |

> **DNS interno Easypanel:** dentro de un proyecto, un servicio resuelve tanto a
> `<proyecto>_<servicio>` como al nombre corto `<servicio>`.
> **⚠️ CRÍTICO para `MINIO_ENDPOINT`:** usa SIEMPRE la forma **corta** `http://minio:9000`.
> La forma larga `<proyecto>_<servicio>` contiene un **guion bajo**, y el **AWS SDK (S3)**
> rechaza hostnames con `_` → la app falla con `Invalid Request (invalid hostname)` al leer/
> escribir en MinIO. (El `pg` de Postgres sí tolera `_`, por eso `DATABASE_URL` puede usar la
> forma larga `<P>_smileforward-db:5432` sin problema; verificado: el login funciona.)

---

## 3. API de Easypanel (referencia técnica verificada)

- **Base:** `https://<PANEL_URL>/api/trpc`
- **Auth:** header `Authorization: Bearer <EASYPANEL_TOKEN>`
- **Formato tRPC:**
  - **Query (lectura, GET):** `GET /api/trpc/<proc>?input=<url-encoded JSON>` donde el JSON
    es `{"json":{...input...}}`.
  - **Mutation (escritura, POST):** `POST /api/trpc/<proc>` con header
    `Content-Type: application/json` y **body** `{"json":{...input...}}`.
  - La respuesta exitosa viene en `result.data.json`. Los errores en `error.json.message`.

### Procedimientos confirmados en este panel
```
projects.createProject                 (mutation)
projects.listProjectsAndServices       (query)   ← úsalo para introspección/idempotencia
services.app.createService             (mutation)
services.app.updateSourceGit           (mutation)
services.app.updateSourceGithub        (mutation)
services.app.updateSourceImage         (mutation)
services.app.updateBuild               (mutation)
services.app.updateEnv                 (mutation)
services.app.updateDeploy              (mutation)
services.app.deployService             (mutation)
services.app.inspectService            (query)
services.postgres.createService        (mutation)
services.postgres.inspectService       (query)
domains.createDomain                   (mutation)
mounts.createMount                     (mutation)
```

> **IMPORTANTE — autocorrección de esquemas:** ya existe un deploy de referencia funcionando
> en este mismo panel, en el proyecto **`smile_forward`** (producción). Si dudas de la forma
> exacta de algún payload, **inspecciónalo primero** con `projects.listProjectsAndServices` y
> `services.app.inspectService` / `services.postgres.inspectService` y **replica esa forma**.
> La verdad sobre el esquema está en ese deploy vivo, no en los ejemplos de abajo.
> No modifiques ni redepliegues nada del proyecto `smile_forward`: úsalo solo de lectura.

### Ejemplos de payload (verifica los nombres de campo contra introspección)

Crear proyecto:
```bash
curl -sX POST "$BASE/projects.createProject" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"json":{"name":"smileforward-copia"}}'
```

Crear servicio app:
```json
{"json":{"projectName":"smileforward-copia","serviceName":"smile_forward"}}
```
Source git de la app:
```json
{"json":{"projectName":"smileforward-copia","serviceName":"smile_forward",
         "repo":"https://github.com/aortiz13/smileforward-copia","ref":"main","path":"/"}}
```
Build (Dockerfile):
```json
{"json":{"projectName":"smileforward-copia","serviceName":"smile_forward",
         "build":{"type":"dockerfile","file":"Dockerfile"}}}
```
> ⚠️ **TRAMPA VERIFICADA:** `updateBuild` espera la config **anidada bajo `build`**. Si mandas
> `type`/`file` en la raíz, la API responde **200 OK pero NO guarda nada** (`build` queda
> `null`) y la UI muestra el asistente de "Compilación" sin tipo seleccionado. **Siempre
> verifica con `inspectService`** que `build` quedó seteado. (Ver §7.)
Env (un solo string multilínea `CLAVE=valor`):
```json
{"json":{"projectName":"smileforward-copia","serviceName":"smile_forward",
         "env":"DATABASE_URL=...\nMINIO_ENDPOINT=...\n..."}}
```
Deploy / disparar build:
```json
{"json":{"projectName":"smileforward-copia","serviceName":"smile_forward","forceRebuild":true}}
```
Postgres:
```json
{"json":{"projectName":"smileforward-copia","serviceName":"smileforward-db",
         "image":"postgres:17","password":"<POSTGRES_PASSWORD>"}}
```
> Tras crearlo, confirma con `services.postgres.inspectService` el `databaseName`/`user`
> reales (en prod son `smile_forward` / `postgres`) y ajusta `DATABASE_URL`.

Deploy avanzado (comando/replicas — p. ej. MinIO):
```json
{"json":{"projectName":"smileforward-copia","serviceName":"minio",
         "deploy":{"replicas":1,"command":"minio server /data --console-address \":9001\"","zeroDowntime":true}}}
```
> ⚠️ **MISMA TRAMPA:** `updateDeploy` espera la config **anidada bajo `deploy`**. En la raíz
> responde 200 pero `command` queda `null` y el contenedor no arranca. Verifica con
> `inspectService`.

Mount de volumen (MinIO) — los campos van **anidados bajo `values`** (no en la raíz):
```json
{"json":{"projectName":"smileforward-copia","serviceName":"minio",
         "values":{"type":"volume","name":"data","mountPath":"/data"}}}
```
Dominio — esquema completo (`createDomain`). **No** acepta la forma corta; requiere `id`
(genéralo tú, estilo cuid), `middlewares:[]`, `certificateResolver:""`, `wildcard:false`,
`destinationType:"service"` y `serviceDestination` con `composeService:""` (string, **no** null):
```json
{"json":{"id":"<cuid-generado>","https":true,"host":"copia.midominio.com","path":"/",
         "middlewares":[],"certificateResolver":"","wildcard":false,"destinationType":"service",
         "serviceDestination":{"protocol":"http","port":4550,"path":"/",
           "projectName":"smileforward-copia","serviceName":"smile_forward","composeService":""}}}
```
> **Puerto de la app = 4550** (el `Dockerfile` hace `EXPOSE 4550` / `PORT=4550`).
> El dominio del servicio MinIO apunta al puerto **9000** (API S3) o **9001** (consola);
> para `MINIO_PUBLIC_URL` usa el de la **API S3 (9000)**.

---

## 4. Pasos del despliegue (en orden)

### 4.1 Preparación
1. Carga `PANEL_URL` y `EASYPANEL_TOKEN`. Define `BASE="$PANEL_URL/api/trpc"`.
2. Verifica auth: `projects.listProjectsAndServices` debe responder 200.
3. Genera todos los secretos de §2.
4. Decide `P=smileforward-copia` (o el que indique el usuario). Si ya existe, sé idempotente.

### 4.2 PostgreSQL
1. `services.postgres.createService` (image `postgres:17`, password `<POSTGRES_PASSWORD>`).
2. `services.postgres.inspectService` → confirma `databaseName`, `user`, host interno.
3. Arranca/despliega el servicio si el panel no lo hace solo.
4. Construye `DATABASE_URL` (§2) con los valores confirmados.

### 4.3 MinIO
1. `services.app.createService` con `serviceName:"minio"`.
2. `services.app.updateSourceImage` → `{"image":"minio/minio:latest"}`.
3. `services.app.updateDeploy` → `command: minio server /data --console-address ":9001"`,
   `replicas:1`, `zeroDowntime:true`.
4. `mounts.createMount` → volumen `data` en `/data`.
5. `services.app.updateEnv`:
   ```
   MINIO_ROOT_USER=<MINIO_ROOT_USER>
   MINIO_ROOT_PASSWORD=<MINIO_ROOT_PASSWORD>
   MINIO_SERVER_URL=https://<dominio-publico-minio>
   ```
6. `domains.createDomain` para el servicio MinIO (puerto **9000**). Toma el `host` resultante
   (o el dominio auto de Easypanel) → ese es `MINIO_PUBLIC_URL` y `NEXT_PUBLIC_STORAGE_URL`.
7. `services.app.deployService` y espera a que quede healthy.

### 4.4 App Smile Forward
1. `services.app.createService` con `serviceName:"smile_forward"`.
2. `services.app.updateSourceGit` → repo de la copia, `ref:"main"`, `path:"/"`.
3. `services.app.updateBuild` → `{"type":"dockerfile","file":"Dockerfile"}`.
4. `services.app.updateEnv` con **todas** las variables (ver matriz §5), una por línea.
   - Si el panel separa *build env* de *runtime env*, replica `NEXT_PUBLIC_STORAGE_URL`
     también en build env (es `NEXT_PUBLIC_*`, se hornea en build; el `Dockerfile` lee el
     ARG `NEXT_PUBLIC_STORAGE_URL`).
5. `domains.createDomain` → dominio público de la app, puerto **4550**, `https:true`.
   - Asegura que `NEXTAUTH_URL` == exactamente esa URL pública (con `https://`, sin slash final).
6. `services.app.deployService` (`forceRebuild:true`) y **espera el build** (es Docker, tarda).
   Monitorea con `services.app.inspectService` hasta estado desplegado/healthy.

### 4.5 Post-deploy (imprescindible para que funcione)

**(a) Migración de base de datos.** Aplica el esquema `migrations/001_initial_schema.sql`.
- Vía recomendada: ejecútalo con `psql "$DATABASE_URL" -f migrations/001_initial_schema.sql`
  desde un contexto que alcance la red interna del proyecto (la consola/terminal del
  contenedor en Easypanel, o cualquier servicio del mismo proyecto).
- Si tu entorno **no** puede alcanzar el Postgres interno y no hay forma de exponerlo de
  forma segura, **pide ayuda al usuario** (es uno de los casos válidos para preguntar):
  pásale el comando `psql` exacto y el `DATABASE_URL` para que lo corra él.

**(b) Buckets de MinIO + política public-read.** La app usa los buckets `generated`,
`uploads` y `scans`. Créalos y aplica política de lectura pública a los públicos. Hay un
script en el repo: `scripts/setup-minio.ts` (aplica public-read a `scans` y `generated`).
- Configura `MINIO_ENDPOINT/ACCESS/SECRET` en el entorno y corre `npx tsx scripts/setup-minio.ts`.
- Crea además el bucket `uploads` si el script no lo hace. (El proxy
  `app/api/storage/[...path]/route.ts` solo sirve `generated` y `uploads`.)

**(c) Usuario admin inicial.** No hay seed automático. Inserta un usuario en `public.users`
con `password_hash` en el formato de la app: `scrypt(password, salt, 64)` →
`"<salt_16_bytes_hex>:<derivedKey_64_bytes_hex>"`.
1. Genera el hash:
   ```bash
   node -e 'const c=require("crypto");const s=c.randomBytes(16).toString("hex");\
   c.scrypt(process.argv[1],s,64,(e,k)=>console.log(s+":"+k.toString("hex")))' "<PASSWORD_ADMIN>"
   ```
2. **Lee `migrations/001_initial_schema.sql`** para conocer las columnas exactas de `users`
   y `user_roles` (no las adivines) e inserta el usuario + su rol `admin`. Esquema esperado:
   `users(id, email, password_hash, name, ...)` y rol en `user_roles`.

**(d) Verificación / health check.**
- La app responde en su dominio (200 en `/`).
- Login en `/administracion` con el admin creado funciona.
- Sube una selfie de prueba en el widget → debe escribir en MinIO y generar análisis
  (requiere `GOOGLE_API_KEY` válida).
- Revisa logs del servicio si algo falla (`services.app.inspectService` / logs del panel).

---

## 5. Matriz de variables de entorno del servicio `smile_forward`

| Variable | Origen | ¿Preguntar al usuario? |
|---|---|---|
| `DATABASE_URL` | derivada (§2) | No |
| `MINIO_ENDPOINT` | derivada: `http://minio:9000` (forma corta, sin `_`) | No |
| `MINIO_ACCESS_KEY` | generada | No |
| `MINIO_SECRET_KEY` | generada | No |
| `MINIO_PUBLIC_URL` | dominio público MinIO (§4.3) | No |
| `NEXT_PUBLIC_STORAGE_URL` | = `MINIO_PUBLIC_URL` | No |
| `NEXTAUTH_SECRET` | generada (`openssl rand -base64 32`) | No |
| `NEXTAUTH_URL` | dominio público de la app | Sí (el dominio, §1.4) |
| `GOOGLE_API_KEY` | **secreto externo** | **Sí** |
| `SMTP_HOSTNAME` | config correo | Opcional |
| `SMTP_USER` | **secreto externo** | Opcional |
| `SMTP_PASS` | **secreto externo** | Opcional |
| `SMTP_FROM` | config correo | Opcional |
| `CLINIC_NOTIFICATION_EMAIL` | config correo | Opcional |
| `DATABASE_SSL` | `false` (Postgres interno, sin TLS) | No |

> **No** repitas claves (en producción aparecían `DATABASE_URL`/`MINIO_*` duplicadas por un
> experimento previo: eso fue un error). Define **cada variable una sola vez**.

---

## 6. Checklist final (no termines hasta cumplir todo)

- [ ] Proyecto `smileforward-copia` creado (sin tocar `smile_forward` de producción).
- [ ] Postgres desplegado; `DATABASE_URL` correcta y verificada.
- [ ] MinIO desplegado con volumen `/data` y dominio público; buckets `generated`,
      `uploads`, `scans` creados con política correcta.
- [ ] App desplegada desde el repo copia, build Docker OK, puerto 4550, dominio + HTTPS.
- [ ] `NEXTAUTH_URL` == dominio real de la app.
- [ ] Migración `001_initial_schema.sql` aplicada.
- [ ] Usuario admin creado y login verificado.
- [ ] Health check OK (home 200, subida de selfie → MinIO + análisis Gemini).
- [ ] Resumen final al usuario con: URLs públicas, credenciales admin (una vez), y aviso de
      **rotar** cualquier secreto que se haya mostrado en texto plano.

---

## 7. Notas y troubleshooting

- **⚠️ Payloads anidados que fallan en silencio (200 OK sin guardar):** varias mutations de
  Easypanel devuelven `{"json":null}` con HTTP 200 aunque NO persistan, si mandas los campos
  en la raíz en vez de anidados. **Verificado en este panel:**
  - `services.app.updateBuild` → anida bajo **`build`**: `{"build":{"type":"dockerfile","file":"Dockerfile"}}`.
    En la raíz, `build` queda `null` y la UI pide elegir tipo de compilación.
  - `services.app.updateDeploy` → anida bajo **`deploy`**: `{"deploy":{"replicas":1,"command":"...","zeroDowntime":true}}`.
    En la raíz, `command` queda `null` (MinIO no arranca).
  - `mounts.createMount` → anida bajo **`values`**: `{"values":{"type":"volume","name":"data","mountPath":"/data"}}`.
  - En cambio `updateSourceGit`, `updateSourceImage` y `updateEnv` **sí** aceptan campos en
    la raíz. **Regla:** tras CADA `update*`, confirma con `inspectService` que el campo quedó
    seteado; no confíes en el 200.
- **Límite de proyectos:** la cuenta puede dar `"You are not allowed to create more projects"`
  en `createProject`. Si pasa, despliega dentro de un proyecto **vacío existente** (idempotente,
  servicios aislados con secretos nuevos) o pide al usuario liberar/ampliar el plan. El DNS
  interno y `databaseName` pasan a derivar del nombre de ese proyecto (p. ej. proyecto
  `dentalflow` → host `dentalflow_smileforward-db`, `databaseName=dentalflow`).
- **Repo privado / acceso git:** el repo `smileforward-copia` es privado; Easypanel no lo clona
  por HTTPS anónimo ni con la SSH genérica. Cada servicio usa su **deploy key propia**: genérala
  con `git.generateKey` (mutation, input `{projectName,serviceName}`), léela con
  `git.getPublicKey` (query, mismo input) y pide al usuario añadirla como **Deploy Key** (solo
  lectura) en `github.com/<owner>/<repo>/settings/keys`. Recién entonces `updateSourceGit` con
  la URL **SSH** `git@github.com:<owner>/<repo>.git` funciona. (Sin deploy key da
  `"Cannot access repository or branch ... doesn't exist"`.)
- **`createDomain` sin dominio propio:** usa el wildcard del servidor `*.<token>.easypanel.host`
  (este panel: `*.uta3hi.easypanel.host`) construyendo un host tipo `<prefijo>.uta3hi.easypanel.host`.
  El esquema completo (id, middlewares, certificateResolver, wildcard, destinationType,
  serviceDestination con `composeService:""`) está en §3.
- **Modelos Gemini retirados:** `app/api/ai/analyze/route.ts` tenía hardcodeado
  `gemini-2.0-flash`, que Google **retiró** (el endpoint `generateContent` devuelve
  `404 "no longer available"` aunque ListModels todavía lo liste). Usa un modelo vigente
  (`gemini-2.5-flash` para análisis visión+JSON). Las rutas `smile`/`video` usan
  `gemini-3-pro-image-preview` + `gemini-2.5-flash-image` (imagen), que siguen vigentes.
  Para ver qué hay disponible: `GET https://generativelanguage.googleapis.com/v1beta/models?key=$GOOGLE_API_KEY`.
- **MinIO/TLS:** la imagen de producción corre con `NODE_TLS_REJECT_UNAUTHORIZED=0` y el
  cliente S3 usa `forcePathStyle:true` y deshabilita verificación TLS (certs self-signed de
  Traefik/Easypanel). No fuerces verificación TLS en el código del servidor.
- **URLs públicas de imágenes:** no son URLs directas de MinIO. `getPublicUrl()` devuelve
  `${NEXTAUTH_URL|APP_URL}/api/storage/<bucket>/<key>`, servido por
  `app/api/storage/[...path]/route.ts` (solo permite `generated` y `uploads`). Si agregas un
  bucket nuevo, hay que añadirlo en esa ruta.
- **Build largo:** el `Dockerfile` es multi-stage con `output:"standalone"`. Da tiempo al
  build y revisa logs si falla; `typescript.ignoreBuildErrors` está activo, así que un fallo
  de build suele ser de dependencias/infra, no de tipos.
- **Middleware:** la protección de rutas vive en `proxy.ts` (no `middleware.ts`).
- **Migraciones:** no hay runner; el `.sql` se aplica a mano (paso 4.5a).
- **Seguridad:** no escribas secretos en commits, logs ni en el repo. Genera, usa, y al final
  recuerda al usuario rotar lo que se haya expuesto.
