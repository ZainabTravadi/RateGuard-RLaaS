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

## Getting Started

1. Install dependencies in each package:
```bash
cd backend && npm install
cd ../frontend && npm install
cd ../rateguard-node && npm install
```

2. Start Redis locally:
```bash
redis-server
```

3. Start the backend:
```bash
cd backend
cp .env.example .env
npm run dev
```

4. Start the frontend:
```bash
cd frontend
cp .env.example .env
npm run dev
```

5. Test the backend health endpoint:
```bash
curl http://localhost:4000/v1/health
```

### Frontend (Dashboard)
```bash
cd frontend
npm install
npm run dev
```
- Vite dev server starts locally and reads `VITE_API_URL` from the environment.

### Backend (Service API)
```bash
cd backend
npm install
npm run dev
```
- Starts the Fastify server via `src/server.js`.
- Required local environment variables are documented in `backend/.env.example`.
- Redis is optional in development; the server falls back to an in-memory mock if `REDIS_URL` is unset.

### SDK (Node.js)
```bash
cd rateguard-node
npm install
npm run build
```
- Builds TypeScript to `dist/`.
- The SDK defaults to `http://localhost:4000` unless `RATEGUARD_URL` or `baseUrl` is provided.

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
