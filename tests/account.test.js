import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { MongoMemoryServer } from "mongodb-memory-server";
import { testConnectOptions } from "./helpers/mongo.js";

import { User } from "../models/user.js";
import { Token } from "../models/token.js";
import { sendMail } from "../utils/sendMail.js";
import * as account from "../services/account.js";

jest.mock("config", () => ({
  get: jest.fn(() => "https://example.com"),
}));

jest.mock("../utils/sendMail.js", () => ({
  __esModule: true,
  sendMail: jest.fn(async () => true),
}));

jest.setTimeout(120000);

let mongo;
let user;

beforeAll(async () => {
  process.env.BCRYPT_SALT = "4"; // fast hashing for tests
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), testConnectOptions);
  await Promise.all([User.init(), Token.init()]);
});

beforeEach(async () => {
  jest.clearAllMocks();
  // The model's pre-save hook hashes the password
  user = await User.create({
    username: "ryanm",
    password: "old-password",
    realName: "Ryan Malacina",
    email: "ryan@example.com",
  });
});

afterEach(async () => {
  await Promise.all([User.deleteMany({}), Token.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

// Pull the raw token out of the reset email's link
function tokenFromEmail() {
  const html = sendMail.mock.calls[0][3];
  return html.match(/token&#x3D;([0-9a-f]+)/)[1];
}

describe("updateProfile", () => {
  it("should update name and email without touching the password", async () => {
    const outcome = await account.updateProfile(user.id, {
      realName: "Ryan M. Malacina",
      email: "new@example.com",
    });

    expect(outcome).toBe("updated");
    const saved = await User.findById(user.id);
    expect(saved.realName).toBe("Ryan M. Malacina");
    expect(saved.email).toBe("new@example.com");
    expect(await saved.validPassword("old-password")).toBe(true);
  });

  it("should change the password only with the right current password", async () => {
    const changes = { realName: user.realName, email: user.email, newPassword: "new-password-123" };

    expect(await account.updateProfile(user.id, { ...changes, currentPassword: "wrong" })).toBe("wrongPassword");
    expect(await account.updateProfile(user.id, changes)).toBe("wrongPassword");
    expect(await account.updateProfile(user.id, { ...changes, currentPassword: "old-password" })).toBe("updated");

    expect(await (await User.findById(user.id)).validPassword("new-password-123")).toBe(true);
  });

  it("should refuse short or empty new passwords", async () => {
    for (const newPassword of ["", "short"]) {
      const outcome = await account.updateProfile(user.id, {
        realName: user.realName,
        email: user.email,
        currentPassword: "old-password",
        newPassword,
      });
      expect(outcome).toBe("weakPassword");
    }
    expect(await (await User.findById(user.id)).validPassword("old-password")).toBe(true);
  });

  it("should reject an empty email instead of saving it", async () => {
    await expect(
      account.updateProfile(user.id, { realName: user.realName, email: "" })
    ).rejects.toThrow();
    expect((await User.findById(user.id)).email).toBe("ryan@example.com");
  });
});

describe("password reset", () => {
  it("should do nothing for unknown or missing emails", async () => {
    expect(await account.requestPasswordReset("nobody@example.com")).toBe(false);
    expect(await account.requestPasswordReset(undefined)).toBe(false);
    expect(sendMail).not.toHaveBeenCalled();
    expect(await Token.countDocuments()).toBe(0);
  });

  it("should store only a hash of the token and email working links", async () => {
    expect(await account.requestPasswordReset("ryan@example.com")).toBe(true);

    const [from, to, subject, html, isHtml] = sendMail.mock.calls[0];
    expect(to).toBe("ryan@example.com");
    expect(subject).toBe("Password Reset Email");
    expect(isHtml).toBe(true);
    expect(html).toContain("https://example.com/resetPassword?token");
    expect(html).toContain("https://example.com/resetPassword/invalidate?token");

    const token = tokenFromEmail();
    const stored = await Token.findOne({ userId: user._id });
    expect(stored.token).not.toBe(token);
    expect(await bcrypt.compare(token, stored.token)).toBe(true);
  });

  it("should replace an earlier pending reset", async () => {
    await account.requestPasswordReset("ryan@example.com");
    await account.requestPasswordReset("ryan@example.com");
    expect(await Token.countDocuments({ userId: user._id })).toBe(1);
  });

  it("should change the password with a valid token, once", async () => {
    await account.requestPasswordReset("ryan@example.com");
    const token = tokenFromEmail();
    sendMail.mockClear();

    expect(await account.completePasswordReset(user.id, token, "brand-new-password")).toBe("changed");
    expect(await (await User.findById(user.id)).validPassword("brand-new-password")).toBe(true);
    expect(sendMail.mock.calls[0][2]).toBe("Password Changed");

    expect(await account.completePasswordReset(user.id, token, "another-password")).toBe("invalidToken");
  });

  it("should refuse bad tokens, malformed input and weak passwords", async () => {
    await account.requestPasswordReset("ryan@example.com");
    const token = tokenFromEmail();

    expect(await account.completePasswordReset(user.id, "0".repeat(64), "brand-new-password")).toBe("invalidToken");
    expect(await account.completePasswordReset("not-an-id", token, "brand-new-password")).toBe("invalidToken");
    expect(await account.completePasswordReset([user.id], token, "brand-new-password")).toBe("invalidToken");
    expect(await account.completePasswordReset(user.id, [token], "brand-new-password")).toBe("invalidToken");
    expect(await account.completePasswordReset(user.id, token, "")).toBe("weakPassword");

    expect(await (await User.findById(user.id)).validPassword("old-password")).toBe(true);
  });

  it("should let the emailed invalidate link cancel the reset", async () => {
    await account.requestPasswordReset("ryan@example.com");
    const token = tokenFromEmail();

    expect(await account.invalidatePasswordReset(user.id, "0".repeat(64))).toBe(false);
    expect(await account.invalidatePasswordReset(user.id, token)).toBe(true);
    expect(await Token.countDocuments()).toBe(0);
    expect(await account.completePasswordReset(user.id, token, "brand-new-password")).toBe("invalidToken");
  });
});
