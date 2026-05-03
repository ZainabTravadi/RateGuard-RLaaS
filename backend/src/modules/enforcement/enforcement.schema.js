import { z } from "zod";

const normalizedIdentifier = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .transform((value) => value.toLowerCase());

export const rateLimitCheckSchema = z.object({
  identifier: normalizedIdentifier,
  endpoint: z.string().trim().min(1).max(256),
  method: z.string().trim().min(1).max(16).transform((value) => value.toUpperCase()),
  smartMode: z.boolean().optional(),
});
