import type {
  RateGuardContext,
  RateGuardEndpointResolver,
  RateGuardIdentifierResolver,
  RateGuardMethodResolver,
  RateGuardPolicyDefinition,
  RateGuardPolicyConditionGroup,
  RateGuardPolicyLogic,
  RateGuardPolicyRule,
  RateGuardPolicyStrategy,
} from "./types.js";
export {
  compilePolicy,
  createPolicyCompiler,
  createPolicyTemplate,
  getPolicyTemplate,
  listPolicyTemplates,
  simulatePolicy,
  PolicyCompiler,
} from "./policy-engine.js";

export class PolicyBuilder {
  private readonly draft: RateGuardPolicyDefinition;
  private readonly commit: (policy: RateGuardPolicyDefinition) => void;

  constructor(name: string, commit: (policy: RateGuardPolicyDefinition) => void) {
    this.draft = {
      name,
      limit: 0,
      window: "1m",
    };
    this.commit = commit;
  }

  private save() {
    this.commit({ ...this.draft });
    return this;
  }

  limit(value: number) {
    this.draft.limit = value;
    return this.save();
  }

  window(value: string | number) {
    this.draft.window = value;
    return this.save();
  }

  identifier(value: RateGuardIdentifierResolver) {
    this.draft.identifier = value;
    return this.save();
  }

  endpoint(value: string | RateGuardEndpointResolver) {
    this.draft.endpoint = value;
    return this.save();
  }

  method(value: string | RateGuardMethodResolver) {
    this.draft.method = value;
    return this.save();
  }

  failMode(value: RateGuardPolicyDefinition["failMode"]) {
    this.draft.failMode = value;
    return this.save();
  }

  smartMode(value: boolean) {
    this.draft.smartMode = value;
    return this.save();
  }

  description(value: string) {
    this.draft.description = value;
    return this.save();
  }

  id(value: string) {
    this.draft.id = value;
    return this.save();
  }

  version(value: number) {
    this.draft.version = value;
    return this.save();
  }

  priority(value: number) {
    this.draft.priority = value;
    return this.save();
  }

  enabled(value: boolean) {
    this.draft.enabled = value;
    return this.save();
  }

  parentPolicy(value: string) {
    this.draft.parentPolicy = value;
    return this.save();
  }

  fallbackPolicy(value: string) {
    this.draft.fallbackPolicy = value;
    return this.save();
  }

  template(value: string) {
    this.draft.template = value;
    return this.save();
  }

  strategy(value: RateGuardPolicyStrategy | RateGuardPolicyStrategy[]) {
    this.draft.strategy = value;
    return this.save();
  }

  logic(value: RateGuardPolicyLogic) {
    this.draft.logic = value;
    return this.save();
  }

  shadow(value: boolean) {
    this.draft.shadow = value;
    return this.save();
  }

  simulate(value: boolean) {
    this.draft.simulate = value;
    return this.save();
  }

  metadata(value: Record<string, unknown>) {
    this.draft.metadata = value;
    return this.save();
  }

  conditions(value: RateGuardPolicyConditionGroup) {
    this.draft.conditions = value;
    return this.save();
  }

  rule(value: RateGuardPolicyRule) {
    this.draft.rules = [...(this.draft.rules || []), value];
    return this.save();
  }

  rules(values: RateGuardPolicyRule[]) {
    this.draft.rules = [...(this.draft.rules || []), ...values];
    return this.save();
  }

  weight(value: number) {
    this.draft.weight = value;
    return this.save();
  }

  burst(value: number) {
    this.draft.burst = value;
    return this.save();
  }

  concurrency(value: number) {
    this.draft.concurrency = value;
    return this.save();
  }

  cost(value: number) {
    this.draft.cost = value;
    return this.save();
  }

  countries(values: string[]) {
    this.draft.countries = values;
    return this.save();
  }

  regions(values: string[]) {
    this.draft.regions = values;
    return this.save();
  }

  tiers(values: string[]) {
    this.draft.tiers = values;
    return this.save();
  }

  workspaceId(value: string) {
    this.draft.workspaceId = value;
    return this.save();
  }

  projectId(value: string) {
    this.draft.projectId = value;
    return this.save();
  }

  environmentId(value: string) {
    this.draft.environmentId = value;
    return this.save();
  }

  build() {
    return { ...this.draft };
  }
}

export function resolvePolicyContext(policy: RateGuardPolicyDefinition, input: RateGuardContext) {
  const identifier = typeof policy.identifier === "function"
    ? policy.identifier(input)
    : input.identifier || input.ip || "anonymous";

  const endpoint = typeof policy.endpoint === "function"
    ? policy.endpoint(input)
    : policy.endpoint || input.endpoint || input.path || "/";

  const method = typeof policy.method === "function"
    ? policy.method(input)
    : policy.method || input.method || "GET";

  return {
    identifier,
    endpoint,
    method,
  };
}
