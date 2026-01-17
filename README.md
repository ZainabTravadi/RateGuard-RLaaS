# 🔵 RateGuard

A developer-first platform for rate limiting as a service. Protect any API endpoint with a lightweight SDK while managing rules, analytics, and configuration via a web dashboard.

---

## 📘 Overview
RateGuard provides a unified way to enforce rate limits across APIs without reinventing infrastructure. Developers add minimal middleware to routes they choose; RateGuard handles decisioning, analytics, and configuration centrally. This keeps your application code clean and your limits consistent.

---

## 🧠 Architecture
- **Frontend (Dashboard)**: React + Vite application for managing API keys, rules, analytics, and logs.
- **Backend (Service API)**: Fastify-based service exposing endpoints for auth, rules, enforcement, analytics, and logging.
- **SDKs**: Lightweight client libraries (starting with Node.js) to integrate per-route protection and communicate with RateGuard.

---

## 🧩 Repository Structure
```
RateGuard/
├─ backend/                # Service API (Fastify)
│  ├─ src/
│  │  ├─ app.js
│  │  ├─ server.js
│  │  ├─ config/
│  │  ├─ db/
│  │  ├─ middleware/
│  │  ├─ modules/          # auth, rules, analytics, enforcement, etc.
│  │  ├─ redis/
│  │  ├─ routes/
│  │  └─ utils/
│  ├─ migrations/
│  ├─ package.json
│  └─ Procfile
├─ frontend/               # React + Vite dashboard
│  ├─ src/
│  │  ├─ pages/            # Docs, Integrations, Analytics, Logs, etc.
│  │  ├─ components/
│  │  ├─ context/
│  │  └─ lib/
│  ├─ package.json
│  └─ vite.config.ts
└─ rateguard-node/         # Node.js SDK (@rateguard/node)
   ├─ src/
   ├─ package.json
   └─ README.md
```

---

## ⚙️ How It Works
- The **SDK** initializes once at app startup with your API key.
- You **apply middleware** only to routes you want protected (e.g., `POST /api/your-endpoint`).
- On each protected request, the SDK performs a fast **limit check** with the RateGuard backend.
- The backend evaluates **rules** (per endpoint/method/identifier) and returns allow/deny with metadata.
- Your app continues normally if allowed, or returns **429** with `Retry-After` headers if limited.
- **Analytics & logs** capture traffic and limit events for monitoring in the dashboard.

---

## 🔷 Features
- **Per-route protection**: Choose exactly which endpoints to guard.
- **Configurable limits**: Per endpoint/method with flexible windows.
- **Identifiers**: IP, user ID, API key, or custom.
- **Observability**: Real-time analytics and logs.
- **Fail-open** and **timeouts**: Resilient behavior for production.
- **Minimal code**: Initialize SDK once, add simple middleware.

---

## 🟦 Local Development

### Frontend (Dashboard)
```bash
cd frontend
npm install
npm run dev
```
- Vite dev server starts locally; environment and auth settings are managed within the app.

### Backend (Service API)
```bash
cd backend
npm install
npm run dev
```
- Starts Fastify server via `src/server.js`.
- Ensure required environment variables (database, SMTP, redis) are configured.

### SDK (Node.js)
```bash
cd rateguard-node
npm install
npm run build
```
- Builds TypeScript to `dist/`.
- Published version: `@rateguard/node@0.1.2`.

---

## 🚀 Deployment
- **Frontend**: Deploy with Vercel or similar static hosts.
- **Backend**: Deploy to Heroku or a Node-friendly host with environment variables and a database.
- **SDK**: Publish to npm via `npm publish` (handled by `prepublishOnly` build script).

---

## 💙 Project Status / Roadmap
- **Current**: Node.js SDK, dashboard for rules/analytics, Fastify backend.
- **Near-term**: Additional SDKs (Python/Java), enhanced analytics, refined identifiers.
- **Ongoing**: Performance tuning, rule management UX, documentation improvements.

---

## 🔹 Links
- **Dashboard**: See repository folder — `frontend/`
- **Docs**: Source in `frontend/src/pages/Docs.tsx`
- **Node SDK**: `rateguard-node/` (npm package name: `@rateguard/node`)

---

Made by Zainab Travadi — <a href="https://www.linkedin.com/in/zainab-travadi-119a83373/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
