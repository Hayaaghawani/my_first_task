import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { AppError, ErrorCode } from "../errors/app-error";

export function validateQuery<TOutput>(schema: ZodType<TOutput>): RequestHandler {
  return (request, response, next) => {
    const result = schema.safeParse(request.query);
    if (!result.success) {
      const issue = result.error.issues[0];
      const field = issue && typeof issue.path[0] === "string"
        ? issue.path[0]
        : undefined;
      const value = field === undefined ? undefined : request.query[field];
      const publicMessage = issue?.code === "invalid_type"
        ? value === undefined
          ? "This search field is required."
          : "Provide one value for this search field."
        : issue?.message ?? "The query parameters are invalid.";

      next(new AppError({
        status: 400,
        code: ErrorCode.INVALID_INPUT,
        publicMessage,
        ...(field === undefined ? {} : { field }),
        cause: result.error,
      }));
      return;
    }

    response.locals.validatedQuery = result.data;
    next();
  };
}
