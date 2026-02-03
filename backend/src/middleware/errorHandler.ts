import { FastifyError, FastifyReply, FastifyRequest } from "fastify";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: Record<string, string[]>;
}

export function errorHandler(
  error: FastifyError | AppError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  request.log.error(error);

  // Handle validation errors (FastifyError has validation property)
  const fastifyError = error as FastifyError;
  if ("validation" in fastifyError && fastifyError.validation) {
    reply.status(400).send({
      success: false,
      error: "Validation error",
      details: fastifyError.validation,
    });
    return;
  }

  // Handle known app errors
  const statusCode = (error as AppError).statusCode || error.statusCode || 500;
  const message = error.message || "Internal server error";

  reply.status(statusCode).send({
    success: false,
    error: message,
    code: (error as AppError).code,
    details: (error as AppError).details,
  });
}

export function createError(
  message: string,
  statusCode: number = 400,
  code?: string,
  details?: Record<string, string[]>
): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
}
