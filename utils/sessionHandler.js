import MongoStore from "connect-mongo";

export function createMongoStore(mongoURL) {
  return MongoStore.create({
    mongoUrl: mongoURL,
    collectionName: "sessions",
    clear_interval: 3600,
  });
}

export function createSession(secret_key, config, mongoStore) {
  return {
    secret: secret_key,
    proxy: config.get("useProxy"),
    resave: config.get("resave"),
    saveUninitialized: config.get("saveUninitialized"),
    name: config.get("cookieName"),
    cookie: {
      httpOnly: config.get("httpOnly"),
      maxAge: config.get("maxAge"),
      secure: config.get("secureCookie"),
      sameSite: config.get("sameSite"),
    },
    store: mongoStore,
  };
}
