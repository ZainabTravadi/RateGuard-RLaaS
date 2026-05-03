import { ZodError } from "zod";

export function validateBody(schema) {
  return async function validateBodyHook(req) {
    try {
      req.body = schema.parse(req.body ?? {});
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = new Error("Invalid input");
        validationError.code = "VALIDATION_ERROR";
        throw validationError;
      }

      throw error;
    }
  };
}
