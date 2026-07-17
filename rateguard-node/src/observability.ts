import type { RateGuardHookName, RateGuardLifecycleContext, RateGuardPlugin } from "./types.js";

export type ObservationKind = "counter" | "gauge" | "histogram" | "timer" | "span";

export interface ObservationEvent {
  name: string;
  timestamp: string;
  kind?: ObservationKind;
  durationMs?: number;
  labels?: Record<string, string | number | boolean | null | undefined>;
  value?: number;
  error?: string;
  attributes?: Record<string, unknown>;
}

export interface ObservationMetric extends ObservationEvent {
  kind: Exclude<ObservationKind, "span">;
}

export interface ObservationSpan extends ObservationEvent {
  kind: "span";
  spanId: string;
  traceId?: string;
  parentSpanId?: string;
  endTimestamp?: string;
  status?: "ok" | "error";
}

export interface ObservationExporter {
  name: string;
  export(event: ObservationEvent): void | Promise<void>;
}

export interface ObservationEmitter {
  emit(event: ObservationEvent): void;
}

export interface ObservabilityPluginOptions {
  serviceName?: string;
  emitter?: ObservationEmitter;
  registry?: ObservabilityRegistry;
  labels?: Record<string, string | number | boolean | null | undefined>;
}

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function now() {
  return new Date().toISOString();
}

function mergeLabels(
  base: Record<string, string | number | boolean | null | undefined> = {},
  extra: Record<string, string | number | boolean | null | undefined> = {}
) {
  return { ...base, ...extra };
}

export class ObservabilityRegistry {
  private readonly exporters = new Map<string, ObservationExporter>();
  private readonly metrics = new Map<string, ObservationMetric>();
  private readonly spans = new Map<string, ObservationSpan>();

  registerExporter(exporter: ObservationExporter) {
    this.exporters.set(exporter.name, exporter);
    return this;
  }

  registerMetric(metric: ObservationMetric) {
    this.metrics.set(metric.name, metric);
    void this.publish(metric);
    return this;
  }

  registerSpan(span: ObservationSpan) {
    this.spans.set(span.spanId, span);
    void this.publish(span);
    return this;
  }

  startSpan(name: string, attributes: Record<string, unknown> = {}) {
    const span: ObservationSpan = {
      name,
      kind: "span",
      spanId: makeId("span"),
      traceId: makeId("trace"),
      timestamp: now(),
      attributes,
      status: "ok",
    };
    this.registerSpan(span);
    return {
      span,
      end: (status: ObservationSpan["status"] = "ok", extra: Partial<ObservationSpan> = {}) => {
        const ended: ObservationSpan = {
          ...span,
          ...extra,
          status,
          endTimestamp: now(),
          durationMs: Date.now() - Date.parse(span.timestamp),
        };
        this.spans.set(span.spanId, ended);
        void this.publish(ended);
        return ended;
      },
    };
  }

  recordMetric(metric: Omit<ObservationMetric, "timestamp"> & { timestamp?: string }) {
    const resolved: ObservationMetric = {
      ...metric,
      timestamp: metric.timestamp || now(),
      kind: metric.kind ?? "counter",
    };
    return this.registerMetric(resolved);
  }

  snapshot() {
    return {
      exporters: [...this.exporters.keys()],
      metrics: [...this.metrics.values()],
      spans: [...this.spans.values()],
    };
  }

  async publish(event: ObservationEvent) {
    for (const exporter of this.exporters.values()) {
      await exporter.export(event);
    }
  }
}

function emitWithRegistry(
  options: ObservabilityPluginOptions,
  event: ObservationEvent
) {
  const registry = options.registry;
  const emitter = options.emitter;
  const enriched = {
    ...event,
    labels: mergeLabels({ serviceName: options.serviceName || "rateguard", ...(options.labels ?? {}) }, event.labels || {}),
  };

  if (registry) {
    if (enriched.kind === "span") {
      registry.registerSpan(enriched as ObservationSpan);
    } else {
      registry.recordMetric(enriched as ObservationMetric);
    }
    return;
  }

  emitter?.emit(enriched);
}

function createMetricPlugin(
  options: ObservabilityPluginOptions,
  name: string,
  kind: ObservationMetric["kind"],
  valueResolver: (ctx: RateGuardLifecycleContext) => number,
  extraLabels: (ctx: RateGuardLifecycleContext) => Record<string, string | number | boolean | null | undefined> = () => ({})
): RateGuardPlugin {
  return {
    name,
    afterRequest(ctx) {
      emitWithRegistry(options, {
        name: `rateguard.${name}`,
        kind,
        timestamp: now(),
        value: valueResolver(ctx),
        labels: mergeLabels(
          {
            policy: ctx.request?.policy || "default",
            decision: ctx.result?.allowed ? "allow" : "block",
          },
          extraLabels(ctx)
        ),
      });
    },
  };
}

export function createOpenTelemetryPlugin(options: ObservabilityPluginOptions): RateGuardPlugin {
  return {
    name: "opentelemetry",
    beforeRequest(ctx) {
      emitWithRegistry(options, {
        name: "rateguard.request.start",
        kind: "span",
        timestamp: now(),
        spanId: makeId("span"),
        traceId: ctx.request?.traceId || makeId("trace"),
        labels: {
          serviceName: options.serviceName || "rateguard",
          policy: ctx.request?.policy || "default",
        },
      } as ObservationSpan);
    },
    afterRequest(ctx) {
      emitWithRegistry(options, {
        name: "rateguard.request.end",
        kind: "span",
        timestamp: now(),
        spanId: makeId("span"),
        traceId: ctx.request?.traceId || makeId("trace"),
        status: ctx.result?.allowed ? "ok" : "error",
        error: ctx.result?.allowed ? undefined : ctx.result?.message || "Rate limit exceeded",
        labels: {
          serviceName: options.serviceName || "rateguard",
          policy: ctx.request?.policy || "default",
          decision: ctx.result?.allowed ? "allow" : "block",
        },
      } as ObservationSpan);
    },
  };
}

export function createPrometheusPlugin(options: ObservabilityPluginOptions): RateGuardPlugin {
  return createMetricPlugin(options, "prometheus", "counter", () => 1);
}

export function createDatadogPlugin(options: ObservabilityPluginOptions): RateGuardPlugin {
  return createMetricPlugin(options, "datadog", "gauge", (ctx) => (ctx.result?.allowed ? 1 : 0));
}

export function createSentryPlugin(options: ObservabilityPluginOptions): RateGuardPlugin {
  return {
    name: "sentry",
    afterRequest(ctx) {
      if (!ctx.result?.allowed) {
        emitWithRegistry(options, {
          name: "rateguard.sentry.event",
          kind: "counter",
          timestamp: now(),
          value: 1,
          error: ctx.result?.message || "Rate limit exceeded",
          labels: {
            policy: ctx.request?.policy || "default",
          },
        });
      }
    },
  };
}

export function createNewRelicPlugin(options: ObservabilityPluginOptions): RateGuardPlugin {
  return createMetricPlugin(options, "newrelic", "counter", (ctx) => (ctx.result?.allowed ? 1 : 0));
}

export function createElasticPlugin(options: ObservabilityPluginOptions): RateGuardPlugin {
  return createMetricPlugin(options, "elastic", "gauge", (ctx) => Number(ctx.result?.remaining ?? 0));
}

export function createGrafanaPlugin(options: ObservabilityPluginOptions): RateGuardPlugin {
  return createMetricPlugin(options, "grafana", "histogram", (ctx) => Number(ctx.result?.limit ?? 0));
}

export function registerExporter(registry: ObservabilityRegistry, exporter: ObservationExporter) {
  return registry.registerExporter(exporter);
}

export function registerMetric(registry: ObservabilityRegistry, metric: ObservationMetric) {
  return registry.registerMetric(metric);
}

export function registerSpan(registry: ObservabilityRegistry, span: ObservationSpan) {
  return registry.registerSpan(span);
}

export function createCustomExporter(
  name: string,
  handler: (event: ObservationEvent) => void | Promise<void>
): ObservationExporter {
  return { name, export: handler };
}

export function createBackendMetricsPlugin(options: ObservabilityPluginOptions): RateGuardPlugin {
  return {
    name: "backend-metrics",
    afterRequest(ctx) {
      emitWithRegistry(options, {
        name: "rateguard.backend.requests",
        kind: "counter",
        timestamp: now(),
        value: 1,
        labels: {
          backend: ctx.result?.backend || "unknown",
          allowed: ctx.result?.allowed ? "true" : "false",
        },
      });
    },
  };
}

export function createPluginMetricsPlugin(options: ObservabilityPluginOptions): RateGuardPlugin {
  return {
    name: "plugin-metrics",
    afterRequest(ctx) {
      emitWithRegistry(options, {
        name: "rateguard.plugin.request",
        kind: "counter",
        timestamp: now(),
        value: 1,
        labels: {
          policy: ctx.request?.policy || "default",
          decision: ctx.result?.allowed ? "allow" : "block",
        },
      });
    },
  };
}

export function createSdkMetricsPlugin(options: ObservabilityPluginOptions): RateGuardPlugin {
  return {
    name: "sdk-metrics",
    beforeInit(ctx) {
      emitWithRegistry(options, {
        name: "rateguard.sdk.init",
        kind: "gauge",
        timestamp: now(),
        value: 1,
        labels: {
          serviceName: options.serviceName || "rateguard",
          sdkVersion: String((ctx.config as { userAgent?: string }).userAgent || "unknown"),
        },
      });
    },
  };
}

export function createRedisMetricsPlugin(options: ObservabilityPluginOptions): RateGuardPlugin {
  return createMetricPlugin(options, "redis-metrics", "counter", (ctx) => (ctx.result?.backend ? 1 : 0));
}

export function createOpenTelemetryExporter(name = "opentelemetry"): ObservationExporter {
  return createCustomExporter(name, () => undefined);
}

export function createPrometheusExporter(name = "prometheus"): ObservationExporter {
  return createCustomExporter(name, () => undefined);
}

export function createDatadogExporter(name = "datadog"): ObservationExporter {
  return createCustomExporter(name, () => undefined);
}

export function createGrafanaExporter(name = "grafana"): ObservationExporter {
  return createCustomExporter(name, () => undefined);
}

export function createElasticExporter(name = "elastic"): ObservationExporter {
  return createCustomExporter(name, () => undefined);
}

export function createNewRelicExporter(name = "newrelic"): ObservationExporter {
  return createCustomExporter(name, () => undefined);
}

export function createSentryExporter(name = "sentry"): ObservationExporter {
  return createCustomExporter(name, () => undefined);
}

export type ObservabilityHookName = RateGuardHookName;
