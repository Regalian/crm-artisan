export type TestCredentials = {
  email: string;
  password: string;
};

export function makeEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export function makeUser(
  prefix = "pw",
  password = "securepassword123!",
): TestCredentials {
  return {
    email: makeEmail(prefix),
    password,
  };
}
