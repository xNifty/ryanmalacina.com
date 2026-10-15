import { accentCss, accentWarnings, contrastRatio } from "../utils/accent.js";

describe("accentCss", () => {
  it("should be empty when nothing is set", () => {
    expect(accentCss({})).toBe("");
    expect(accentCss({ accentLight: "", accentDark: "" })).toBe("");
  });

  it("should derive the accent variables for each theme", () => {
    const css = accentCss({ accentLight: "#6D28D9", accentDark: "#a78bfa" });
    expect(css).toContain(':root:not([data-theme="dark"]) { --accent: #6d28d9;');
    expect(css).toContain(':root[data-theme="dark"] { --accent: #a78bfa;');
    // White text on a dark accent, dark text on a light one
    expect(css).toMatch(/not\(\[data-theme="dark"\]\) \{[^}]*--accent-text: #ffffff;/);
    expect(css).toMatch(/:root\[data-theme="dark"\] \{[^}]*--accent-text: #04210f;/);
    expect(css).toContain("--accent-soft: rgba(109, 40, 217, 0.1);");
    expect(css).toContain("--mark: rgba(167, 139, 250, 0.28);");
  });

  it("should ignore anything that isn't a hex colour", () => {
    expect(accentCss({ accentLight: "red;}</style><script>", accentDark: "#12345" })).toBe("");
  });
});

describe("accentWarnings", () => {
  it("should flag accents that are hard to read on the page", () => {
    expect(accentWarnings({ accentLight: "#087f44", accentDark: "#3ddc84" })).toEqual([]);
    const warnings = accentWarnings({ accentLight: "#ffff00", accentDark: "#111111" });
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toMatch(/^The light theme accent has a contrast of 1\.\d:1/);
  });

  it("should compute WCAG contrast", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#777777", "#777777")).toBe(1);
  });
});
