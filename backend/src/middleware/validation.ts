import { ZodSchema, ZodError } from "zod";
import { createError } from "./errorHandler.js";

export function validateBody<T>(schema: ZodSchema<T>, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      const details: Record<string, string[]> = {};
      for (const issue of err.issues) {
        const key = issue.path.join(".") || "_root";
        if (!details[key]) details[key] = [];
        details[key].push(issue.message);
      }
      throw createError("Validation error", 400, "VALIDATION_ERROR", details);
    }
    throw err;
  }
}
