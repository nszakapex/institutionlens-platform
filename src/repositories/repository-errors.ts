import "server-only";

import { DomainError } from "@/domain/errors";

export type RepositoryErrorCode =
  | "INVALID_QUERY"
  | "NOT_FOUND"
  | "NOT_AUTHORIZED"
  | "TIMEOUT"
  | "UNAVAILABLE"
  | "MISCONFIGURED"
  | "INVALID_RESPONSE";

const PUBLIC_MESSAGES: Readonly<Record<RepositoryErrorCode, string>> = Object.freeze({
  INVALID_QUERY: "Request validation failed.",
  NOT_FOUND: "Resource not found.",
  NOT_AUTHORIZED: "Not authorized for this action.",
  TIMEOUT: "The data request timed out.",
  UNAVAILABLE: "The data service is unavailable.",
  MISCONFIGURED: "The data service is not configured.",
  INVALID_RESPONSE: "The data service returned an invalid response.",
});

export class RepositoryError extends Error {
  readonly code: RepositoryErrorCode;
  readonly publicMessage: string;

  constructor(code: RepositoryErrorCode) {
    super(PUBLIC_MESSAGES[code]);
    this.name = "RepositoryError";
    this.code = code;
    this.publicMessage = PUBLIC_MESSAGES[code];
  }
}

export function classifyRepositoryError(error: unknown): RepositoryError {
  if (error instanceof RepositoryError) return error;
  if (error instanceof DomainError) {
    if (error.code === "NOT_FOUND") return new RepositoryError("NOT_FOUND");
    if (error.code === "AUTHORIZATION") return new RepositoryError("NOT_AUTHORIZED");
    if (error.code === "VALIDATION") return new RepositoryError("INVALID_QUERY");
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return new RepositoryError("TIMEOUT");
  }
  return new RepositoryError("UNAVAILABLE");
}
