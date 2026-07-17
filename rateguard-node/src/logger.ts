import type { RateGuardLogLevel, RateGuardLogger } from "./types.js";

export type LogFormat = "json" | "pretty" | "silent";

export interface StructuredLogEntry {
  timestamp: string;
  requestId?: string | null;
  correlationId?: string | null;
  traceId?: string | null;
  workspace?: string | null;
  policy?: string | null;
  decision?: string;
  latency?: number;
  durationMs?: number;
  retryCount?: number;
  sdkVersion?: string;
  backendVersion?: string | null;
  message?: string;
  level?: RateGuardLogLevel;
  context?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface LoggerOptions {
  format?: LogFormat;
  redact?: string[];
  debug?: boolean;
  trace?: boolean;
  sampleRate?: number;
  level?: RateGuardLogLevel;
  context?: Record<string, unknown>;
  adapter?: RateGuardLogger;
  bindings?: Record<string, unknown>;
}

function redactValue(value: unknown, redact: string[]): unknown {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, redact));
  }

  const clone: Record<string, unknown> = { ...(value as Record<string, unknown>) };
  for (const key of Object.keys(clone)) {
    if (redact.includes(key)) {
      clone[key] = "[REDACTED]";
    } else if (clone[key] && typeof clone[key] === "object") {
      clone[key] = redactValue(clone[key], redact);
    }
  }
  return clone;
}

function shouldSample(sampleRate: number | undefined) {
  if (sampleRate === undefined || sampleRate >= 1) return true;
  if (sampleRate <= 0) return false;
  return Math.random() < sampleRate;
}

function normalizeLevel(level?: RateGuardLogLevel): RateGuardLogLevel {
  return level ?? "info";
}

function resolveAdapter(adapter?: RateGuardLogger): RateGuardLogger | undefined {
  return adapter;
}

export function createLogger(options: LoggerOptions = {}): RateGuardLogger {
  const format = options.format ?? "json";
  const redact = options.redact ?? ["apiKey", "authorization", "x-api-key", "token", "secret"];
  const baseContext = { ...(options.context ?? {}), ...(options.bindings ?? {}) };
  const minLevel = normalizeLevel(options.level);
  const adapter = resolveAdapter(options.adapter);
  const levelWeight: Record<RateGuardLogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
  };

  function isEnabled(level: RateGuardLogLevel) {
    if (options.debug) return true;
    return levelWeight[level] >= levelWeight[minLevel];
  }

  function emit(level: RateGuardLogLevel, message: string, meta?: unknown) {
    if (format === "silent") return;
    if (!isEnabled(level)) return;
    if (!shouldSample(options.sampleRate)) return;

    const metaObject = meta && typeof meta === "object" ? (redactValue(meta, redact) as Record<string, unknown>) : meta;
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...baseContext,
      ...(metaObject && typeof metaObject === "object" ? metaObject : {}),
    };

    if (adapter) {
      const fn = adapter[level] ?? adapter.info;
      fn?.(entry.message as string, entry);
      return;
    }

    if (format === "pretty") {
      const line = `[${entry.timestamp}] ${level.toUpperCase()} ${message}`;
      if (level === "error") console.error(line, metaObject ?? "");
      else if (level === "warn") console.warn(line, metaObject ?? "");
      else console.log(line, metaObject ?? "");
      return;
    }

    const line = JSON.stringify(entry);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  }

  return {
    level: minLevel,
    debug: (message, meta) => emit("debug", message, meta),
    info: (message, meta) => emit("info", message, meta),
    warn: (message, meta) => emit("warn", message, meta),
    error: (message, meta) => emit("error", message, meta),
    child(bindings: Record<string, unknown>) {
      return createLogger({
        ...options,
        context: { ...baseContext, ...bindings },
        bindings: { ...baseContext, ...bindings },
      });
    },
    withContext(bindings: Record<string, unknown>) {
      return createLogger({
        ...options,
        context: { ...baseContext, ...bindings },
        bindings: { ...baseContext, ...bindings },
      });
    },
  };
}

export function logDecision(entry: StructuredLogEntry, logger: RateGuardLogger = createLogger()) {
  logger.info?.("RateGuard decision", entry);
}

export function timeLogger<T>(logger: RateGuardLogger, label: string, fn: () => Promise<T> | T) {
  const started = Date.now();
  return Promise.resolve(fn()).finally(() => {
    logger.info?.(label, { durationMs: Date.now() - started });
  });
}
