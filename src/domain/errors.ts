/**
 * Safe domain errors — public messages must not leak tenant IDs, paths, or payloads.
 */

export type DomainErrorCode =
  | "VALIDATION"
  | "AUTHORIZATION"
  | "NOT_FOUND"
  | "UNSUPPORTED_VERTICAL"
  | "UNSUPPORTED_ADAPTER_VERSION"
  | "INVARIANT_VIOLATION"
  | "INVALID_RULE"
  | "RULE_EVALUATION"
  | "INSUFFICIENT_EVIDENCE"
  | "UNSUPPORTED_RULE_SET"
  | "PORTFOLIO_CONFIG"
  | "ASSESSMENT_INVARIANT";

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

export class InvalidRuleDefinitionError extends DomainError {
  constructor(publicMessage = "Rule definition is invalid.", internalDetail?: string) {
    super("INVALID_RULE", publicMessage, internalDetail);
    this.name = "InvalidRuleDefinitionError";
  }
}

export class RuleEvaluationError extends DomainError {
  constructor(publicMessage = "Rule evaluation failed.", internalDetail?: string) {
    super("RULE_EVALUATION", publicMessage, internalDetail);
    this.name = "RuleEvaluationError";
  }
}

export class InsufficientEvidenceError extends DomainError {
  constructor(publicMessage = "Evidence is insufficient for assessment.", internalDetail?: string) {
    super("INSUFFICIENT_EVIDENCE", publicMessage, internalDetail);
    this.name = "InsufficientEvidenceError";
  }
}

export class UnsupportedRuleSetVersionError extends DomainError {
  constructor(publicMessage = "Rule-set version is not supported.", internalDetail?: string) {
    super("UNSUPPORTED_RULE_SET", publicMessage, internalDetail);
    this.name = "UnsupportedRuleSetVersionError";
  }
}

export class PortfolioConfigurationError extends DomainError {
  constructor(publicMessage = "Portfolio configuration is invalid.", internalDetail?: string) {
    super("PORTFOLIO_CONFIG", publicMessage, internalDetail);
    this.name = "PortfolioConfigurationError";
  }
}

export class AssessmentInvariantError extends DomainError {
  constructor(publicMessage = "Assessment invariant violated.", internalDetail?: string) {
    super("ASSESSMENT_INVARIANT", publicMessage, internalDetail);
    this.name = "AssessmentInvariantError";
  }
}
