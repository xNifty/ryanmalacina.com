export default {
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".jsx"],
  testMatch: ["<rootDir>/tests/**/*.test.js"], // Update this line
  transform: {
    "^.+\\.jsx?$": "babel-jest",
  },
  // htmlparser2 (used by sanitize-html), its dom* helpers and dateformat ship ESM only, so Babel has to
  // transform them. Only the last node_modules/ segment is checked, since they sit nested
  // under sanitize-html/node_modules/.
  transformIgnorePatterns: [
    "/node_modules/(?!.*/node_modules/)(?!(htmlparser2|domhandler|domutils|dom-serializer|domelementtype|entities|dateformat)/)",
  ],
  globals: {
    "ts-jest": {
      useESM: true,
    },
  },
  moduleNameMapper: {
    "\\.(css|less|scss)$": "identity-obj-proxy",
  },
  moduleDirectories: ["node_modules", "src"],
};
