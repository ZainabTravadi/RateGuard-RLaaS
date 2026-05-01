import dotenv from "dotenv";
dotenv.config();

function required(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || 4000,
  DATABASE_URL: required("DATABASE_URL"),
  JWT_SECRET: required("JWT_SECRET"),
  REDIS_URL: process.env.REDIS_URL || "",
  API_URL: process.env.API_URL || `http://localhost:${process.env.PORT || 4000}`,
  DEFAULT_ENV_BASE_URL:
    process.env.DEFAULT_ENV_BASE_URL || "http://localhost:3000",
  DEFAULT_DEV_ENV_BASE_URL:
    process.env.DEFAULT_DEV_ENV_BASE_URL || "http://localhost:3001",
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || "console",
  SMTP_HOST: process.env.SMTP_HOST || "localhost",
  SMTP_PORT: process.env.SMTP_PORT || "587",
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  FROM_EMAIL: process.env.FROM_EMAIL || "noreply@rateguard.local",
};
