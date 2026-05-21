const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const REQUIRED_EMAIL_ERROR = "Email is required";
export const INVALID_EMAIL_ERROR = "Please enter a valid email address";

export function normalizeTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue === "" ? null : trimmedValue;
}

export function validateRequiredTrimmedString(
  value: unknown,
  errorMessage: string,
): string | null {
  return normalizeTrimmedString(value) ? null : errorMessage;
}

export function hasValidDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): boolean {
  if (!startDate || !endDate) {
    return true;
  }

  return new Date(startDate) <= new Date(endDate);
}

export function getFirstValidationError(
  errors: Record<string, string | undefined>,
): string | null {
  return Object.values(errors).find((value): value is string => Boolean(value)) ?? null;
}

export function isValidEmail(email: string): boolean {
  const trimmedEmail = email.trim();
  return trimmedEmail !== "" && EMAIL_REGEX.test(trimmedEmail);
}

export function validateRequiredEmail(email: unknown): string | null {
  if (typeof email !== "string" || email.trim() === "") {
    return REQUIRED_EMAIL_ERROR;
  }

  return isValidEmail(email) ? null : INVALID_EMAIL_ERROR;
}
