import { NextResponse } from "next/server";
import type { DomainError } from "@/shared";
import type { ZodError } from "zod";

// RFC 7807 Problem Details. Single source of error serialization for REST.

const STATUS_BY_CODE: Record<string, number> = {
  validation: 422,
  not_found: 404,
  forbidden: 403,
  conflict: 409,
  invalid_transition: 422,
};

const TYPE_BY_CODE: Record<string, string> = {
  validation: "https://trackr.app/errors/validation",
  not_found: "https://trackr.app/errors/not-found",
  forbidden: "https://trackr.app/errors/forbidden",
  conflict: "https://trackr.app/errors/conflict",
  invalid_transition: "https://trackr.app/errors/invalid-transition",
};

export function domainErrorToProblem(error: DomainError): NextResponse {
  const status = STATUS_BY_CODE[error.code] ?? 500;
  const type = TYPE_BY_CODE[error.code] ?? "https://trackr.app/errors/internal";
  const body = {
    type,
    title: error.code,
    status,
    detail: error.message,
    ...(error.meta ?? {}),
  };
  return NextResponse.json(body, {
    status,
    headers: { "content-type": "application/problem+json" },
  });
}

export function validationProblem(zodError: ZodError, instance?: string): NextResponse {
  const fields: Record<string, string> = {};
  for (const issue of zodError.issues) {
    fields[issue.path.join(".") || "_"] = issue.message;
  }
  return NextResponse.json(
    {
      type: "https://trackr.app/errors/validation",
      title: "validation",
      status: 422,
      detail: "Request body failed validation",
      fields,
      ...(instance ? { instance } : {}),
    },
    { status: 422, headers: { "content-type": "application/problem+json" } },
  );
}

export function unauthorizedProblem(detail = "Missing or invalid authentication"): NextResponse {
  return NextResponse.json(
    {
      type: "https://trackr.app/errors/unauthorized",
      title: "unauthorized",
      status: 401,
      detail,
    },
    { status: 401, headers: { "content-type": "application/problem+json" } },
  );
}
