import { DomainError } from "./domain-error";

export class NotFoundError extends DomainError {
  readonly code = "not_found";
  constructor(resource: string, id?: string) {
    super(id ? `${resource} '${id}' not found` : `${resource} not found`, {
      resource,
      ...(id ? { id } : {}),
    });
  }
}

export class ForbiddenError extends DomainError {
  readonly code = "forbidden";
  constructor(message = "Forbidden", meta?: Record<string, unknown>) {
    super(message, meta);
  }
}

export class ValidationError extends DomainError {
  readonly code = "validation";
  constructor(message: string, fields?: Record<string, string>) {
    super(message, fields ? { fields } : undefined);
  }
}

export class ConflictError extends DomainError {
  readonly code = "conflict";
  constructor(message: string, meta?: Record<string, unknown>) {
    super(message, meta);
  }
}

export class InvalidTransitionError extends DomainError {
  readonly code = "invalid_transition";
  constructor(
    currentState: string,
    attemptedState: string,
    extra?: Record<string, unknown>,
  ) {
    super(`Cannot transition from '${currentState}' to '${attemptedState}'`, {
      currentState,
      attemptedState,
      ...extra,
    });
  }
}
