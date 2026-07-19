import dotenv from "dotenv";
import { ConfigurationError, ValidationError } from "../errors/index.js";

dotenv.config();

const DOCS = "https://rateguard.dev/docs/configuration";
const ALLOWED_FAIL_MODES = new Set(["failClosed", "failOpen", "warnOnly", "shadowMode"]);

function requireValue(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new ConfigurationError(`${name} is missing.\n\nGenerate or set it before starting RateGuard.\nDocumentation: ${DOCS}`, {
      details: { envName: name },
      documentationURL: DOCS,
    });
  }
  return String(value).trim();
}

function parseInteger(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new ValidationError(`${name} must be a non-negative integer.`, {
      details: { envName: name, value: raw },
      documentationURL: DOCS,
    });
  }
  return value;
}

function parseFailMode() {
  const mode = process.env.RATE_LIMIT_FAIL_MODE;
  const legacy = process.env.RATE_LIMIT_FAIL_OPEN;

  if (mode && legacy !== undefined) {
    throw new ConfigurationError(
      "Do not configure both RATE_LIMIT_FAIL_MODE and RATE_LIMIT_FAIL_OPEN. RATE_LIMIT_FAIL_OPEN is deprecated.",
      {
        details: { envNames: ["RATE_LIMIT_FAIL_MODE", "RATE_LIMIT_FAIL_OPEN"] },
        documentationURL: "https://rateguard.dev/docs/fail-modes",
      }
    );
  }

  if (!mode && legacy === undefined) {
    throw new ConfigurationError(
      "RATE_LIMIT_FAIL_MODE is required.\n\nChoose one of: failClosed, failOpen, warnOnly, shadowMode.\nDocumentation: https://rateguard.dev/docs/fail-modes",
      {
        details: { envName: "RATE_LIMIT_FAIL_MODE" },
        documentationURL: "https://rateguard.dev/docs/fail-modes",
      }
    );
  }

  const selected = mode || (String(legacy).toLowerCase() === "false" ? "failClosed" : "failOpen");
  if (!ALLOWED_FAIL_MODES.has(selected)) {
    throw new ValidationError(`Invalid RATE_LIMIT_FAIL_MODE "${selected}".`, {
      details: {
        envName: "RATE_LIMIT_FAIL_MODE",
        allowedValues: [...ALLOWED_FAIL_MODES],
      },
      documentationURL: "https://rateguard.dev/docs/fail-modes",
    });
  }

  return selected;
}

function validateNodeVersion() {
  const major = Number(process.versions.node.split(".")[0] || 0);
  if (Number.isNaN(major) || major < 18) {
    throw new ConfigurationError(
      `RateGuard backend requires Node.js 18+. Current version: ${process.versions.node}.`,
      {
        details: { currentVersion: process.versions.node, requiredVersion: "18+" },
        documentationURL: "https://rateguard.dev/docs/installation",
      }
    );
  }
}

validateNodeVersion();

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInteger("PORT", 4000),
  DATABASE_URL: requireValue("DATABASE_URL"),
  JWT_SECRET: requireValue("JWT_SECRET"),
  REDIS_URL: process.env.REDIS_URL ? String(process.env.REDIS_URL).trim() : "",
  REDIS_TIMEOUT_MS: parseInteger("REDIS_TIMEOUT_MS", 250),
  RATE_LIMIT_FAIL_MODE: parseFailMode(),
  RATE_LIMIT_FAIL_OPEN: process.env.RATE_LIMIT_FAIL_MODE
    ? process.env.RATE_LIMIT_FAIL_MODE === "failOpen"
    : String(process.env.RATE_LIMIT_FAIL_OPEN).toLowerCase() !== "false",
  API_URL: process.env.API_URL ? String(process.env.API_URL).trim() : "https://rateguard-7b9988e4d5f5.herokuapp.com",
  DEFAULT_ENV_BASE_URL: process.env.DEFAULT_ENV_BASE_URL ? String(process.env.DEFAULT_ENV_BASE_URL).trim() : "http://localhost:3000",
  DEFAULT_DEV_ENV_BASE_URL: process.env.DEFAULT_DEV_ENV_BASE_URL ? String(process.env.DEFAULT_DEV_ENV_BASE_URL).trim() : "http://localhost:3001",
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || "console",
  SMART_MODE: String(process.env.SMART_MODE).toLowerCase() === "true",
  SMTP_HOST: process.env.SMTP_HOST || "localhost",
  SMTP_PORT: parseInteger("SMTP_PORT", 587),
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  FROM_EMAIL: process.env.FROM_EMAIL || "noreply@rateguard.local",
  SECURITY_LOG_LEVEL: process.env.SECURITY_LOG_LEVEL || "info",
};

export const runtimeConfig = {
  failMode: env.RATE_LIMIT_FAIL_MODE,
  failOpen: env.RATE_LIMIT_FAIL_OPEN,
};
