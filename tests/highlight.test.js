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

  it("should highlight each word of a search, preferring the longest match", () => {
    expect(highlightTerm("Moving to HTMX from jQuery", "jquery htmx")).toBe(
      "Moving to <mark>HTMX</mark> from <mark>jQuery</mark>"
    );
    expect(highlightTerm("htmx", "h htmx")).toBe("<mark>htmx</mark>");
  });

  it("should leave HTML entities whole", () => {
    expect(highlightTerm("Love &#60;3 and 60 fps", "60")).toBe("Love &#60;3 and <mark>60</mark> fps");
    expect(highlightTerm("Tom &amp; Jerry", "amp")).toBe("Tom &amp; Jerry");
  });

  it("should return the input unchanged for missing or blank terms", () => {
    expect(highlightTerm("text", undefined)).toBe("text");
    expect(highlightTerm("text", "   ")).toBe("text");
    expect(highlightTerm("text", ["array"])).toBe("text");
  });
});
