import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { AppError, ErrorCode } from "../errors/app-error";

export function validateParams<TOutput>(schema: ZodType<TOutput>): RequestHandler {
  return (request, response, next) => {
    const result = schema.safeParse(request.params.id);
    if (!result.success) {
      const issue = result.error.issues[0];
      next(new AppError({
        status: 400,
        code: ErrorCode.INVALID_INPUT,
        publicMessage: issue?.message ?? "The request path is invalid.",
        field: "id",
        cause: result.error,
      }));
      return;
    }

    response.locals.validatedParams = result.data;
    next();
  };
}
