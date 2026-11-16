import type { RequestHandler } from "express";
import { AppError, ErrorCode } from "../errors/app-error.js";

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new AppError({
    status: 404,
    code: ErrorCode.NOT_FOUND,
    publicMessage: `No route matches ${request.method} ${request.path}.`,
  }));
};
