export const ErrorCode = {
  INVALID_INPUT: "INVALID_INPUT",
  NOT_FOUND: "NOT_FOUND",
  LISTING_NOT_FOUND: "LISTING_NOT_FOUND",
  SOLR_ERROR: "SOLR_ERROR",
  SOLR_UNAVAILABLE: "SOLR_UNAVAILABLE",
  SOLR_TIMEOUT: "SOLR_TIMEOUT",
  INTERNAL: "INTERNAL",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

type AppErrorOptions = {
  status: 400 | 404 | 500 | 502 | 503 | 504;
  code: ErrorCode;
  publicMessage: string;
  field?: string;
  cause?: unknown;
};

export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly publicMessage: string;
  readonly field?: string;

  constructor(options: AppErrorOptions) {
    if (!Number.isInteger(options.status) || options.status < 400 || options.status > 599) {
      throw new Error("AppError status must be an HTTP error status between 400 and 599");
    }

    super(options.publicMessage, { cause: options.cause });
    this.name = "AppError";
    this.status = options.status;
    this.code = options.code;
    this.publicMessage = options.publicMessage;
    if (options.field !== undefined) {
      this.field = options.field;
    }
  }
}
