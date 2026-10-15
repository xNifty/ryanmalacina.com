import { renderSvg, renderPng, wrapText } from "../services/ogImage.js";

describe("wrapText", () => {
  it("should wrap on words and cut overflow with an ellipsis", () => {
    const lines = wrapText("one two three four five six seven", { fontSize: 10, charWidth: 1, maxWidth: 100, maxLines: 2 });
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe("one two");
    expect(lines[1].endsWith("…")).toBe(true);
  });

  it("should break words longer than a line", () => {
    const lines = wrapText("abcdefghijklmnop", { fontSize: 10, charWidth: 1, maxWidth: 60, maxLines: 5 });
    expect(lines.every((line) => line.length <= 6)).toBe(true);
  });
});

describe("renderSvg", () => {
  it("should escape text and fall back to the default accent", () => {
    const svg = renderSvg({ title: "<script>&", subtitle: 'a "b"', command: "cat x", accent: "nope" });
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&#60;script&#62;&#38;");
    expect(svg).toContain("#3ddc84");
  });

  it("should use a custom accent", () => {
    expect(renderSvg({ title: "Hi", accent: "#a78bfa" })).toContain('fill="#a78bfa"');
  });
});

describe("renderPng", () => {
  it("should produce a cached PNG", () => {
    const png = renderPng({ title: "Ryan Malacina" }, "test-key");
    expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect(renderPng({ title: "Ryan Malacina" }, "test-key")).toBe(png);
  });
});
