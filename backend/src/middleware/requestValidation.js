import { ZodError } from "zod";
import { ValidationError } from "../errors/index.js";

export function validateBody(schema) {
  return async function validateBodyHook(req) {
    try {
      req.body = schema.parse(req.body ?? {});
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError("Invalid request body.", {
          details: { issues: error.issues },
          cause: error,
          documentationURL: "https://rateguard.dev/docs/errors",
        });
      }

      throw error;
    }
  };
}

