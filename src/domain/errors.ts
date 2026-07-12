/**
 * Safe domain errors — public messages must not leak tenant IDs, paths, or payloads.
 */

export type DomainErrorCode =
  | "VALIDATION"
  | "AUTHORIZATION"
  | "NOT_FOUND"
  | "UNSUPPORTED_VERTICAL"
  | "UNSUPPORTED_ADAPTER_VERSION"
  | "INVARIANT_VIOLATION";

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly publicMessage: string;

  constructor(code: DomainErrorCode, publicMessage: string, internalDetail?: string) {
    super(internalDetail ?? publicMessage);
    this.name = "DomainError";
    this.code = code;
    this.publicMessage = publicMessage;
  }
}

export class ValidationError extends DomainError {
  constructor(publicMessage = "Request validation failed.", internalDetail?: string) {
    super("VALIDATION", publicMessage, internalDetail);
    this.name = "ValidationError";
  }
}

export class AuthorizationError extends DomainError {
  constructor(publicMessage = "Not authorized for this action.", internalDetail?: string) {
    super("AUTHORIZATION", publicMessage, internalDetail);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends DomainError {
  constructor(publicMessage = "Resource not found.", internalDetail?: string) {
    super("NOT_FOUND", publicMessage, internalDetail);
    this.name = "NotFoundError";
  }
}

export class UnsupportedVerticalError extends DomainError {
  constructor(publicMessage = "Vertical is not supported.", internalDetail?: string) {
    super("UNSUPPORTED_VERTICAL", publicMessage, internalDetail);
    this.name = "UnsupportedVerticalError";
  }
}

export class UnsupportedAdapterVersionError extends DomainError {
  constructor(publicMessage = "Adapter version is not supported.", internalDetail?: string) {
    super("UNSUPPORTED_ADAPTER_VERSION", publicMessage, internalDetail);
    this.name = "UnsupportedAdapterVersionError";
  }
}

export class InvariantViolationError extends DomainError {
  constructor(publicMessage = "Domain invariant violated.", internalDetail?: string) {
    super("INVARIANT_VIOLATION", publicMessage, internalDetail);
    this.name = "InvariantViolationError";
  }
}
