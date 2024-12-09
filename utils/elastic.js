import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { Client } = require("@elastic/elasticsearch");

let client = null;

/**
  * @param {string} username - The username to connect to the client with
  * @param {string} password - The password to connect to the client with
  * @param {string} url - The URL to connect to
  * @returns {Client} - The client to connect to
*/
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
