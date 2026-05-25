import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/auth", () => ({
  signup: vi.fn(),
}));

import SignupForm from "@/app/(auth)/signup/SignupForm";

describe("SignupForm", () => {
  it("shows a helpful error and blocks submit when passwords do not match", async () => {
    const user = userEvent.setup();

    render(<SignupForm />);

    await user.type(screen.getByLabelText("Email"), "new-user@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "different456");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("lets the user reveal and hide the password field", async () => {
    const user = userEvent.setup();

    render(<SignupForm />);

    const passwordInput = screen.getByLabelText("Password");
    const toggle = screen.getAllByRole("button", { name: /show password/i })[0];

    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(toggle);
    expect(passwordInput).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: /hide password/i }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });
});
