# RateGuard 🚀

Production-grade Rate Limiting as a Service (RLaaS)

RateGuard helps teams protect APIs with fast, centralized rate limiting, adaptive enforcement, analytics, and a lightweight Node.js SDK. It is built for production systems that need predictable control, observability, and easy integration.

---

## 🔥 Key Features

- Redis + Lua sliding window rate limiting
- Adaptive rate limiting with progressive throttling
- Analytics dashboard for visibility and control
- SDK for fast integration in Node.js services
- Fault-tolerant behavior with fail-open support

---

## 📦 Install SDK

```bash
npm install @rateguard/node
```

---

## ⚡ Quick Start

```js
import express from "express";
import { RateGuard } from "@rateguard/node";

const app = express();

RateGuard.init({
  apiKey: "your_api_key",
  baseUrl: "http://localhost:4000"
});

app.use(RateGuard.middleware());

app.get("/", (req, res) => {
  res.send("Hello RateGuard");
});

app.listen(3000);
```

---

## 🧠 How It Works

RateGuard uses a Redis sliding window algorithm to track request activity over time and enforce limits with precision. Lua scripting keeps each check atomic, reducing race conditions and ensuring the limiter remains consistent under load. Smart mode adds adaptive behavior, so repeated abuse can trigger progressive throttling instead of a single static response.

---

## ⚙️ Architecture Overview

- Backend: Node.js service with Redis-backed enforcement and rule management
- Frontend: React dashboard for analytics, logs, and configuration
- SDK layer: `@rateguard/node` for app-level integration and request protection

---

## 📊 Performance

- Low latency, typically around 3–10ms for enforcement checks in a healthy environment
- Single Redis call via Lua for atomic decisioning
- Scalable design suited for modern API traffic patterns

---

## 🔐 Security

- API key validation for protected service access
- Rate-limited auth routes to reduce abuse
- Safe error handling with fail-open support for resilient deployments

---

## 📁 Project Structure

```text
RateGuard/
├── backend/
├── frontend/
└── rateguard-node/
```

---

## 🚀 Roadmap

- Additional SDKs for Python and Go
- Dashboard improvements for analytics and rule management
- Distributed scaling for larger deployments

---

## 🤝 Contributing

Contributions are welcome. If you want to help, fork the repository, create a feature branch, make your changes, and open a pull request with a clear summary of what changed.

---

## 📄 License

MIT License
