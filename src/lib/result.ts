/** Translatable error codes (see `errors.*` in messages). */
export type ErrorCode =
  | "generic"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "invalid_input"
  | "rate_limited"
  | "invalid_credentials"
  | "account_suspended"
  | "account_banned"
  | "email_taken"
  | "invalid_token"
  | "wrong_password"
  | "event_unavailable"
  | "event_past"
  | "sold_out"
  | "sales_closed"
  | "invalid_ticket"
  | "booking_expired"
  | "booking_not_pending"
  | "payment_failed"
  | "not_attendee"
  | "event_not_started"
  | "capacity_exceeded"
  | "cannot_moderate_self"
  | "has_bookings"
  | "invalid_image"
  | "upload_unavailable"
  | "already_organizer";

export type FieldErrors = Record<string, string>;

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: ErrorCode; fieldErrors?: FieldErrors };

export function ok(): ActionResult<undefined>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function fail(error: ErrorCode, fieldErrors?: FieldErrors): { ok: false; error: ErrorCode; fieldErrors?: FieldErrors } {
  return { ok: false, error, fieldErrors };
}

/** Business rule violation thrown inside services / transactions. */
export class DomainError extends Error {
  constructor(public readonly code: ErrorCode) {
    super(code);
    this.name = "DomainError";
  }
}

export function toFieldErrors(issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function errorFromUnknown(error: unknown): ErrorCode {
  if (error instanceof DomainError) return error.code;
  console.error(error);
  return "generic";
}
