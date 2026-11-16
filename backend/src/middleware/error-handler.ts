import type { ErrorRequestHandler } from "express";
import { AppError, ErrorCode } from "../errors/app-error.js";

type ErrorBody = {
  code: ErrorCode;
  message: string;
  field?: string;
};

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  return new AppError({
    status: 500,
    code: ErrorCode.INTERNAL,
    publicMessage: "Something went wrong",
    cause: error,
  });
}

function errorBody(error: AppError): ErrorBody {
  const body: ErrorBody = {
    code: error.code,
    message: error.publicMessage,
  };

  if (error.field !== undefined) {
    body.field = error.field;
  }

  return body;
}

function logError(input: { error: AppError; method: string; url: string }): void {
  const { error, method, url } = input;
  const field = error.field === undefined ? "" : ` field=${error.field}`;
  const line = `${error.status} ${error.code}${field} ${method} ${url}`;
  const write = error.status >= 500 ? console.error : console.warn;
  write(`${line}\n${error.stack ?? error.message}`);
  if (error.cause !== undefined) {
    write("Cause:", error.cause);
  }
}

export const errorHandler: ErrorRequestHandler = (err, request, response, next) => {
  if (response.headersSent) {
    next(err);
    return;
  }

  const error = toAppError(err);
  logError({ error, method: request.method, url: request.originalUrl });
  response.status(error.status).json({ error: errorBody(error) });
};
