export function computePriority(scope, endpoint) {
  if (endpoint && scope === "user") return 1;
  if (endpoint && scope === "ip") return 2;
  if (!endpoint && scope === "user") return 3;
  if (!endpoint && scope === "ip") return 4;
  return 5;
}
