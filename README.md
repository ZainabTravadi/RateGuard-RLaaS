# RateGuard 🚀

**Centralized dashboard-controlled API protection for Node.js applications.**

RateGuard is a production-grade Rate Limiting as a Service (RLaaS) platform that lets you define rate limiting rules in a centralized dashboard and enforce them dynamically across your Node.js applications. No hardcoding limits. No redeployment. Just real-time policy management at scale.

---

## 🎯 Features

- **Dashboard-Controlled Rate Limiting** — Define rules in the UI, SDK enforces them automatically
- **Dynamic Runtime Updates** — Change limits instantly without redeploying applications
- **Real-Time Analytics & Logs** — Monitor traffic, blocked requests, and enforcement patterns
- **Redis + Lua-Backed Enforcement** — Sliding window algorithm with atomic decisioning
- **Adaptive Progressive Throttling** — Smart mode detects abuse and applies intelligent backoff
- **Production-Ready SDK** — Easy Express.js integration with fail-open resilience
- **Centralized Policy Management** — Unified control across all environments and services

---

## 🏗️ Architecture Overview

```
Your Express App
  ↓
RateGuard SDK Middleware (@rateguard/node)
  ↓
RateGuard Backend API (http://localhost:4000)
  ↓
Redis + Database
  ↓
Analytics Engine + Request Logs
  ↓
Frontend Dashboard (http://localhost:5173)
```

### How It Works

1. **Dashboard defines rules** — Create rate limiting policies per endpoint, user, or IP
2. **SDK fetches rules dynamically** — On app startup and at runtime, the SDK pulls active rules from the backend
3. **Middleware enforces automatically** — Each request is evaluated against live rules; no code changes needed
4. **Analytics update in real-time** — Dashboard displays traffic, block rate, and enforcement metrics
5. **Developers never hardcode limits** — Policies are always managed centrally

---

## 📁 Monorepo Structure

```
RateGuard/
├── backend/                    # Node.js API server + Redis enforcement engine
│   ├── src/
│   │   ├── app.js             # Express application
│   │   ├── server.js          # Server entry point
│   │   ├── config/            # Configuration (env, secrets)
│   │   ├── db/                # Database connection and queries
│   │   ├── middleware/        # Auth, validation, error handling
│   │   ├── modules/           # Feature modules (auth, rules, analytics, etc.)
│   │   ├── redis/             # Redis client and Lua scripts
│   │   └── utils/             # Helpers and utilities
│   ├── migrations/            # Database schema migrations
│   ├── scripts/               # Utility scripts (load tests, health checks)
│   ├── package.json
│   └── Procfile               # Heroku deployment configuration
│
├── frontend/                   # React + TypeScript dashboard
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/            # Dashboard pages (Overview, Rules, Logs, Analytics)
│   │   ├── lib/              # API client and utilities
│   │   ├── context/          # React context (Auth, etc.)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── App.tsx           # Main app component
│   │   └── main.tsx          # Entry point
│   ├── package.json
│   ├── vite.config.ts        # Vite build configuration
│   ├── tailwind.config.ts    # Tailwind CSS configuration
│   └── tsconfig.json         # TypeScript configuration
│
└── rateguard-node/            # npm package: @rateguard/node SDK
    ├── src/
    │   ├── client.ts         # Main SDK client
    │   ├── middleware.ts     # Express middleware
    │   ├── limiter.ts        # Rate limiting logic
    │   ├── config.ts         # Configuration handling
    │   ├── types.ts          # TypeScript definitions
    │   ├── errors.ts         # Custom error classes
    │   └── utils/            # Utility functions
    ├── examples/             # Example Express apps
    ├── package.json
    ├── tsconfig.json         # TypeScript configuration
    └── README.md             # SDK documentation
```

### Package Responsibilities

- **`backend/`** — Hosts the RateGuard API, enforces rules using Redis, stores analytics and logs, serves the dashboard
- **`frontend/`** — React dashboard where teams create rules, view logs, monitor analytics, and manage API keys
- **`rateguard-node/`** — npm package (`@rateguard/node`) that developers install in their apps to use the SDK middleware

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourorg/RateGuard.git
cd RateGuard
```

### 2. Set Up Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:4000` by default.

### 3. Set Up Frontend

```bash
cd ../frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` by default.

### 4. Integrate the SDK into Your App

```bash
npm install @rateguard/node
```

Create a `.env` file:

```env
RATEGUARD_API_KEY=your_api_key_here
RATEGUARD_BASE_URL=http://localhost:4000
```

In your Express app:

```js
import express from "express";
import dotenv from "dotenv";
import { RateGuard } from "@rateguard/node";

dotenv.config();

RateGuard.init({
  apiKey: process.env.RATEGUARD_API_KEY,
  baseUrl: process.env.RATEGUARD_BASE_URL
});

const app = express();

app.use(express.json());

app.use(
  RateGuard.middleware({
    identifier: (req) => req.headers["x-user-id"] || req.ip
  })
);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/test", (req, res) => {
  res.json({ success: true, message: "Protected route" });
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`App running on http://localhost:${PORT}`);
});
```

### 5. Create a Rule in the Dashboard

1. Open `http://localhost:5173` (frontend dashboard)
2. Go to **Rules** page
3. Click **Create Rule**
4. Set limit: `10 requests / minute`
5. Set endpoint: `/test`
6. Set scope: `IP`
7. Enable the rule

### 6. Test Rate Limiting

```bash
# Run your app
node your-app.js

# Send 20 rapid requests
for i in {1..20}; do
  curl http://localhost:3000/test
done
```

Expected: First 10 requests return `200`, remaining return `429 Too Many Requests`.

---

## 📚 SDK Documentation

For complete SDK setup, examples, and API reference, see the npm package documentation:

**[@rateguard/node on npm](https://www.npmjs.com/package/@rateguard/node)**

The SDK README includes:

- Installation
- Environment variables
- Express integration
- Middleware options
- Programmatic API
- Dashboard rules explanation
- Troubleshooting guide
- Production checklist

---

## 🛠️ Development

### Prerequisites

- Node.js 18+ 
- npm or bun
- Redis (for backend enforcement)
- SQLite or PostgreSQL (for rule storage)

### Running All Services Locally

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: Your test app
cd path/to/your/app && npm run dev

# Terminal 4: Send test requests
# (use curl or test scripts)
```

### Environment Variables

**Backend (`.env` in `/backend`):**

```env
PORT=4000
DATABASE_URL=sqlite://./database.db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret
```

**Frontend (`.env` in `/frontend`):**

```env
VITE_API_URL=http://localhost:4000
```

---

## 🚢 Deployment

### Backend Deployment (Heroku)

```bash
# Add Heroku remote
heroku create your-app-name

# Set environment variables
heroku config:set REDIS_URL=your-redis-url
heroku config:set DATABASE_URL=your-db-url
heroku config:set JWT_SECRET=your-secret

# Deploy
git push heroku main
```

Backend will be available at `https://your-app-name.herokuapp.com`.

### Frontend Deployment (Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel
```

Set `VITE_API_URL` to your production backend URL.

### Production Environment Variables

**Backend:**

```env
RATEGUARD_BASE_URL=https://your-app-name.herokuapp.com
DATABASE_URL=your-production-db-url
REDIS_URL=your-production-redis-url
JWT_SECRET=your-production-secret
NODE_ENV=production
```

**SDK Apps:**

```env
RATEGUARD_API_KEY=your_api_key
RATEGUARD_BASE_URL=https://your-app-name.herokuapp.com
```

---

## 🤝 Contributing

### Fork & Branch

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/yourusername/RateGuard.git
cd RateGuard

# Create a feature branch
git checkout -b feature/my-feature
```

### Make Changes

- Modify code in backend, frontend, or SDK
- Test locally with `npm run dev` in each package
- Ensure tests pass: `npm test` (if applicable)

### Submit a Pull Request

```bash
# Push your branch
git push origin feature/my-feature

# Create PR on GitHub
# Describe changes, reference issues if applicable
# Request review from maintainers
```

### Code Standards

- Use consistent formatting (ESLint/Prettier configured in each package)
- Write clear commit messages
- Add tests for new features
- Update documentation as needed

---

## 📊 Performance Characteristics

- **Latency**: 3–10ms per rate limit check (Redis + Lua)
- **Throughput**: Scales horizontally with Redis replication
- **Availability**: Fail-open support ensures requests pass even if backend is down
- **Storage**: Rule definitions in database; counters in Redis

---

## 🔐 Security

- **API Key Validation** — All SDK requests authenticated via API key
- **Rate-Limited Auth** — Login and key creation endpoints are rate-limited to prevent abuse
- **Environment Isolation** — Separate API keys per environment (dev, staging, prod)
- **Fail-Open Behavior** — If backend unreachable, requests are allowed (not denied)

---

## 📝 License

[Your License Here]

---

## 🤝 Contributing

Contributions are welcome. If you want to help, fork the repository, create a feature branch, make your changes, and open a pull request with a clear summary of what changed.

---

## 📄 License

MIT License
