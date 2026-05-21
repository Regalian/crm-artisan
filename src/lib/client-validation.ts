import {
  getFirstValidationError,
  normalizeTrimmedString,
  validateRequiredEmail,
  validateRequiredTrimmedString,
} from "@/lib/validation";

export const CLIENT_NAME_REQUIRED_ERROR = "Name is required";
export const CLIENT_PHONE_REQUIRED_ERROR = "Phone is required";

export type ClientValidationErrors = {
  name?: string;
  phone?: string;
  email?: string;
};

export function validateClientInput(
  input: { name: unknown; phone?: unknown; email: unknown },
  options: { requirePhone?: boolean } = {},
): ClientValidationErrors {
  const errors: ClientValidationErrors = {};

  const nameError = validateRequiredTrimmedString(input.name, CLIENT_NAME_REQUIRED_ERROR);
  if (nameError) {
    errors.name = nameError;
  }

  if (options.requirePhone) {
    const phoneError = validateRequiredTrimmedString(input.phone, CLIENT_PHONE_REQUIRED_ERROR);
    if (phoneError) {
      errors.phone = phoneError;
    }
  }

  const emailError = validateRequiredEmail(input.email);
  if (emailError) {
    errors.email = emailError;
  }

  return errors;
}

export function getClientValidationError(
  input: { name: unknown; phone?: unknown; email: unknown },
  options: { requirePhone?: boolean } = {},
): string | null {
  return getFirstValidationError(validateClientInput(input, options));
}

export function normalizeClientInput(input: {
  name: unknown;
  phone?: unknown;
  email?: unknown;
  address?: unknown;
  notes?: unknown;
}) {
  return {
    name: normalizeTrimmedString(input.name) ?? "",
    phone: normalizeTrimmedString(input.phone),
    email: normalizeTrimmedString(input.email),
    address: normalizeTrimmedString(input.address),
    notes: normalizeTrimmedString(input.notes),
  };
}
