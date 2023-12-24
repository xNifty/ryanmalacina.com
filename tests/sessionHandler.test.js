import MongoStore from "connect-mongo";
import {
  clearProjectSession,
  clearProjectEditSession,
  createMongoStore,
  createSession,
} from "../utils/sessionHandler.js";

jest.mock("connect-mongo");

describe("clearProjectSession", () => {
  it("should clear the project session", () => {
    const req = {
      session: {
        projectReturnTo: "test value",
        projectEditReturnTo: "test value",
        project_id: "test value",
        projectEditSuccess: "test value",
      },
    };
    clearProjectSession(req);

    expect(req.session.projectReturnTo).toBeUndefined();
    expect(req.session.projectEditReturnTo).toBeUndefined();
    expect(req.session.project_id).toBeUndefined();
    expect(req.session.projectEditSuccess).toBeUndefined();
  });

  it("should clear the project edit session", () => {
    const req = {
      session: {
        loadProjectFromSession: "test value",
        project_name: "test value",
        project_title: "test value",
        project_source: "test value",
        project_description_markdown: "test value",
        project_image: "test value",
        project_id: "test value",
      },
    };
    clearProjectEditSession(req);

    expect(req.session.loadProjectFromSession).toBeUndefined();
    expect(req.session.project_name).toBeUndefined();
    expect(req.session.project_title).toBeUndefined();
    expect(req.session.project_source).toBeUndefined();
    expect(req.session.project_description_markdown).toBeUndefined();
    expect(req.session.project_image).toBeUndefined();
    expect(req.session.project_id).toBeUndefined();
  });

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
