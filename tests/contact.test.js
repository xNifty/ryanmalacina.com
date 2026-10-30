import { validateContactForm, sendContactForm } from "../services/contact.js";
import { sendContactMessage } from "../utils/sendMail.js";

jest.mock("../utils/sendMail.js", () => ({
  __esModule: true,
  sendContactMessage: jest.fn(async () => true),
}));

const good = {
  name: " Ryan ",
  email: "visitor@example.com",
  subject: "Hello\r\nBcc: someone@example.com",
  message: "  Line one\nLine two  ",
};

describe("validateContactForm", () => {
  it("should clean a good form, keeping header fields on one line", () => {
    const { values, errors } = validateContactForm(good);
    expect(errors).toEqual([]);
    expect(values).toEqual({
      name: "Ryan",
      email: "visitor@example.com",
      subject: "Hello Bcc: someone@example.com",
      message: "Line one\nLine two",
    });
  });

  it("should flag every missing field", () => {
    const { errors, invalid } = validateContactForm({});
    expect(errors).toHaveLength(4);
    expect(invalid).toEqual({ name: true, email: true, subject: true, message: true });
  });

  it("should reject an address that can't be replied to", () => {
    const { errors, invalid } = validateContactForm({ ...good, email: "not an email" });
    expect(errors).toEqual(["Please provide a valid email."]);
    expect(invalid).toEqual({ email: true });
  });

  it("should ignore non-string values", () => {
    const { invalid } = validateContactForm({ ...good, name: ["a", "b"] });
    expect(invalid).toEqual({ name: true });
  });
});

describe("sendContactForm", () => {
  it("should reply to the visitor, naming them in the subject", async () => {
    const { values } = validateContactForm(good);
    await expect(sendContactForm(values)).resolves.toBe(true);
    expect(sendContactMessage).toHaveBeenCalledWith(
      "visitor@example.com",
      "Email received on behalf of Ryan: Hello Bcc: someone@example.com",
      expect.stringContaining("Line one\nLine two")
    );
  });
});
