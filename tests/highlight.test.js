import { highlightTerm } from "../utils/highlight.js";

describe("highlightTerm", () => {
  it("should wrap matches case-insensitively, keeping the content's own casing", () => {
    expect(highlightTerm("Hello hello HELLO", "hello")).toBe(
      "<mark>Hello</mark> <mark>hello</mark> <mark>HELLO</mark>"
    );
  });

  it("should never insert the user's term as markup", () => {
    const term = "<img src=x onerror=alert(1)>";
    expect(highlightTerm("<p>nothing to see</p>", term)).toBe("<p>nothing to see</p>");
  });

  it("should not touch tags or attributes", () => {
    expect(highlightTerm('<a href="/link">link text</a>', "link")).toBe(
      '<a href="/link"><mark>link</mark> text</a>'
    );
  });

  it("should treat regex characters literally", () => {
    expect(highlightTerm("a.b axb", "a.b")).toBe("<mark>a.b</mark> axb");
  });

  it("should return the input unchanged for missing or blank terms", () => {
    expect(highlightTerm("text", undefined)).toBe("text");
    expect(highlightTerm("text", "   ")).toBe("text");
    expect(highlightTerm("text", ["array"])).toBe("text");
  });
});
