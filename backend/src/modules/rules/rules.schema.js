import { z } from "zod";

export const createRuleSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  scope: z.enum(["global", "service", "endpoint"]),
  endpoint: z.string().nullable(),
  limit: z.number().min(1),
  window: z.enum(["1s", "10s", "1m", "5m", "1h"]),
  enabled: z.boolean()
});
