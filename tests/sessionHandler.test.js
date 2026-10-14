import MongoStore from "connect-mongo";
import { createMongoStore, createSession } from "../utils/sessionHandler.js";

jest.mock("connect-mongo");

describe("sessionHandler", () => {
  describe("createMongoStore", () => {
    it("should create a MongoStore with provided configuration", () => {
      const mockCreate = jest.fn();
      MongoStore.create = mockCreate;

      const mongoURL = "mongodb://localhost:27017/test";
      const result = createMongoStore(mongoURL);

      expect(mockCreate).toHaveBeenCalledWith({
        mongoUrl: mongoURL,
        collectionName: "sessions",
        clear_interval: 3600,
      });
    });
  });

  describe("createSession", () => {
    it("should create a session with provided configuration", () => {
      const secret_key = "test";
      const config = {
        get: jest.fn((key) => {
          const configValues = {
            useProxy: true,
            resave: true,
            saveUninitialized: true,
            cookieName: "test",
            httpOnly: true,
            maxAge: 3600000,
            secureCookie: true,
            sameSite: "lax",
          };
          return configValues[key];
        }),
      };
      const mongoStore = jest.fn();
      const result = createSession(secret_key, config, mongoStore);

      expect(result).toEqual({
        secret: secret_key,
        proxy: true,
        resave: true,
        saveUninitialized: true,
        name: "test",
        cookie: {
          httpOnly: true,
          maxAge: 3600000,
          secure: true,
          sameSite: "lax",
        },
        store: mongoStore,
      });
    });
  });
});
