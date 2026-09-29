import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// resend v4 reports API failures as `{ data: null, error }` rather than
// throwing - sendEmail must turn that into a throw, since registration and
// the contact form only detect a failed send through an exception.
const send = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

async function loadModule() {
  vi.resetModules();
  vi.stubEnv("RESEND_API_KEY", "re_test");
  return import("./resend");
}

describe("sendEmail", () => {
  beforeEach(() => {
    send.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns the message id on success", async () => {
    send.mockResolvedValue({ data: { id: "msg_1" }, error: null });
    const { sendEmail } = await loadModule();
    await expect(sendEmail("a@b.pl", "Hi", "<p>Hi</p>")).resolves.toEqual({ id: "msg_1" });
  });

  it("throws when Resend returns an error instead of throwing", async () => {
    send.mockResolvedValue({ data: null, error: { name: "validation_error", message: "The twostepsstudio.gg domain is not verified" } });
    const { sendEmail } = await loadModule();
    await expect(sendEmail("a@b.pl", "Hi", "<p>Hi</p>")).rejects.toThrow("domain is not verified");
  });

  it("propagates the failure through sendAccountConfirmationEmail", async () => {
    send.mockResolvedValue({ data: null, error: { name: "rate_limit_exceeded", message: "Too many requests" } });
    const { sendAccountConfirmationEmail } = await loadModule();
    await expect(sendAccountConfirmationEmail("a@b.pl", "Ala", "https://example.com/confirm")).rejects.toThrow("rate_limit_exceeded");
  });
});
