export default {
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".jsx"],
  testMatch: ["<rootDir>/tests/**/*.test.js"], // Update this line
  transform: {
    "^.+\\.jsx?$": "babel-jest",
  },
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
