import { prepareImageUpload, MAX_IMAGE_BYTES } from "../utils/imageUpload.js";
import { strings } from "../config/constants.js";

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function makeFile(overrides = {}) {
  return {
    name: "logo.png",
    mimetype: "image/png",
    size: PNG_BYTES.length,
    truncated: false,
    data: PNG_BYTES,
    ...overrides,
  };
}

describe("prepareImageUpload", () => {
  it("should accept a valid PNG and build a safe unique name", () => {
    const result = prepareImageUpload(makeFile({ name: "My Logo (final).png" }));
    expect(result.error).toBeUndefined();
    expect(result.fileName).toMatch(/^My-Logo-final--\d+\.png$/);
  });

  it("should reject a disallowed extension", () => {
    const result = prepareImageUpload(
      makeFile({ name: "page.html", mimetype: "text/html", data: Buffer.from("<html>") })
    );
    expect(result.error).toBe(strings.errors.imageInvalid);
  });

  it("should reject a non-image renamed to .png", () => {
    const result = prepareImageUpload(makeFile({ data: Buffer.from("<svg onload=alert(1)>") }));
    expect(result.error).toBe(strings.errors.imageInvalid);
  });

  it("should reject a mismatched mimetype", () => {
    const result = prepareImageUpload(makeFile({ mimetype: "image/svg+xml" }));
    expect(result.error).toBe(strings.errors.imageInvalid);
  });

  it("should reject files over the size limit", () => {
    expect(prepareImageUpload(makeFile({ truncated: true })).error).toBe(
      strings.errors.imageTooLarge
    );
    expect(prepareImageUpload(makeFile({ size: MAX_IMAGE_BYTES + 1 })).error).toBe(
      strings.errors.imageTooLarge
    );
  });

  it("should not allow path segments in the generated name", () => {
    const result = prepareImageUpload(makeFile({ name: "../../app.png" }));
    expect(result.fileName).toMatch(/^app-\d+\.png$/);
  });

  it("should reject missing or multiple files", () => {
    expect(prepareImageUpload(undefined).error).toBe(strings.errors.imageInvalid);
    expect(prepareImageUpload([makeFile(), makeFile()]).error).toBe(
      strings.errors.imageInvalid
    );
  });
});
