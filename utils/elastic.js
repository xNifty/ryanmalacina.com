import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { Client } = require("@elastic/elasticsearch");

let client = null;

function connectToClient(username, password, url) {
  if (!client) {
    client = new Client({
      node: url,
      auth: {
        username: username,
        password: password,
      },
    });
  }

  return client;
}

export default connectToClient;
