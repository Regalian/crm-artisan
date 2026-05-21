const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const REQUIRED_EMAIL_ERROR = "Email is required";
export const INVALID_EMAIL_ERROR = "Please enter a valid email address";

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
