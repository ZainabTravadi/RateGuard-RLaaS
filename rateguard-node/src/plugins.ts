import { ConfigurationError, InternalServerError } from "./errors.js";
import type {
  MaybePromise,
  RateGuardHookName,
  RateGuardLifecycleContext,
  RateGuardPlugin,
  RateGuardPluginCommand,
  RateGuardPluginContext,
  RateGuardPluginMetadata,
  RateGuardPluginRegistration,
  RateGuardPluginServices,
} from "./types.js";

function normalizeMetadata(plugin: RateGuardPlugin): RateGuardPluginRegistration {
  const metadata: RateGuardPluginMetadata = {
    name: plugin.metadata?.name || plugin.name,
    version: plugin.metadata?.version,
    description: plugin.metadata?.description,
    priority: plugin.metadata?.priority ?? plugin.priority ?? 0,
    enabled: plugin.metadata?.enabled ?? plugin.enabled ?? true,
    dependencies: plugin.metadata?.dependencies ?? plugin.dependencies ?? [],
    tags: plugin.metadata?.tags ?? [],
  };

  return {
    enabled: metadata.enabled !== false,
    priority: metadata.priority ?? 0,
    metadata,
  };
}

function createServices(): RateGuardPluginServices {
  const services: RateGuardPluginServices = {
    middlewares: [],
    commands: new Map<string, RateGuardPluginCommand>(),
    registerMiddleware(middleware) {
      services.middlewares.push(middleware);
    },
    registerCommand(command) {
      services.commands.set(command.name, command);
    },
    injectStorage(storage) {
      services.storage = storage;
    },
    injectTransport(transport) {
      services.transport = transport;
    },
    injectLogger(logger) {
      services.logger = logger;
    },
    injectTelemetry(telemetry) {
      services.telemetry = telemetry;
    },
  };

  return services;
}

function mergeResult(current: RateGuardLifecycleContext, patch?: Partial<RateGuardLifecycleContext> | void) {
  if (!patch) return current;
  return {
    ...current,
    ...patch,
  } as RateGuardLifecycleContext;
}

export class PluginRegistry {
  private readonly plugins = new Map<string, RateGuardPlugin>();
  private readonly services = createServices();
  private validated = false;

  register(plugin: RateGuardPlugin) {
    if (!plugin?.name || !plugin.name.trim()) {
      throw new ConfigurationError("RateGuard plugin must have a non-empty name.");
    }

    if (this.plugins.has(plugin.name)) {
      throw new ConfigurationError(`Duplicate RateGuard plugin "${plugin.name}" detected.`, {
        details: { plugin: plugin.name },
      });
    }

    this.plugins.set(plugin.name, { ...plugin });
    this.validated = false;
    return this;
  }

  registerMany(plugins: RateGuardPlugin[]) {
    for (const plugin of plugins) {
      this.register(plugin);
    }
    return this;
  }

  get(name: string) {
    return this.plugins.get(name);
  }

  remove(name: string) {
    this.plugins.delete(name);
    this.validated = false;
    return this;
  }

  enable(name: string) {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new ConfigurationError(`Plugin "${name}" is not registered.`);
    }
    plugin.enabled = true;
    if (plugin.metadata) plugin.metadata.enabled = true;
    this.validated = false;
    return this;
  }

  disable(name: string) {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new ConfigurationError(`Plugin "${name}" is not registered.`);
    }
    plugin.enabled = false;
    if (plugin.metadata) plugin.metadata.enabled = false;
    this.validated = false;
    return this;
  }

  list() {
    return this.resolveOrder().map((plugin) => ({
      ...plugin,
      metadata: normalizeMetadata(plugin).metadata,
    }));
  }

  servicesSnapshot() {
    return this.services;
  }

  private resolveOrder() {
    const nodes = [...this.plugins.values()];
    const normalized = nodes.map((plugin) => ({ plugin, meta: normalizeMetadata(plugin) }));
    const byName = new Map(normalized.map(({ plugin }) => [plugin.name, plugin] as const));
    const order: RateGuardPlugin[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const dfs = (plugin: RateGuardPlugin) => {
      if (visited.has(plugin.name)) return;
      if (visiting.has(plugin.name)) {
        throw new ConfigurationError(`Circular plugin dependency detected at "${plugin.name}".`, {
          details: { plugin: plugin.name, dependencies: plugin.dependencies || plugin.metadata?.dependencies || [] },
        });
      }

      visiting.add(plugin.name);
      const dependencies = plugin.metadata?.dependencies ?? plugin.dependencies ?? [];
      for (const dependency of dependencies) {
        const child = byName.get(dependency);
        if (!child) {
          throw new ConfigurationError(`Plugin "${plugin.name}" depends on missing plugin "${dependency}".`, {
            details: { plugin: plugin.name, dependency },
          });
        }
        dfs(child);
      }
      visiting.delete(plugin.name);
      visited.add(plugin.name);
      order.push(plugin);
    };

    [...normalized]
      .filter(({ meta }) => meta.enabled)
      .sort((a, b) => b.meta.priority - a.meta.priority)
      .forEach(({ plugin }) => dfs(plugin));

    return order;
  }

  private async ensureValidated(ctx: RateGuardPluginContext) {
    if (this.validated) return;
    for (const plugin of this.resolveOrder()) {
      if (plugin.enabled === false || plugin.metadata?.enabled === false) {
        continue;
      }
      if (typeof plugin.validate === "function") {
        await plugin.validate(ctx);
      }
    }
    this.validated = true;
  }

  async runHook<K extends RateGuardHookName>(
    name: K,
    ctx: K extends "beforeInit" | "afterInit" | "beforeShutdown" | "afterShutdown"
      ? RateGuardPluginContext
      : RateGuardLifecycleContext
  ) {
    const baseContext = {
      ...ctx,
      services: this.services,
    } as RateGuardLifecycleContext;

    await this.ensureValidated(baseContext);

    let current: RateGuardLifecycleContext = baseContext;
    const plugins = this.resolveOrder();
    for (const plugin of plugins) {
      if (plugin.enabled === false || plugin.metadata?.enabled === false) {
        continue;
      }

      const hook = plugin[name];
      if (typeof hook !== "function") {
        continue;
      }

      try {
        const result = await (hook as (arg: RateGuardLifecycleContext) => MaybePromise<void | Partial<RateGuardLifecycleContext>>)(current);
        current = mergeResult(current, result);
      } catch (error) {
        throw new InternalServerError(`Plugin "${plugin.name}" failed during ${name}.`, {
          cause: error,
          details: {
            plugin: plugin.name,
            hook: name,
          },
        });
      }
    }

    return current as typeof ctx;
  }
}

export function createPluginRegistry(initialPlugins: RateGuardPlugin[] = []) {
  const registry = new PluginRegistry();
  registry.registerMany(initialPlugins);
  return registry;
}

export function createPluginServices() {
  return createServices();
}
