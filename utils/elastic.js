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


export async function ensureNewsIndex(client) {
  try {
    const exists = await client.indices.exists({ index: 'news' });
    console.log('Exists: ', exists);
    if (!exists) {
      await client.indices.create({
        index: 'news',
        body: {
          mappings: {
            properties: {
              news_title: { type: 'text' },
              news_description_html: { type: 'text' },
              published_date: { type: 'text' },
              published_date_unclean: { type: 'date' },
              news_clean_output: { type: 'text' },
            },
          },
        },
      });
      console.log('Created news index.');
    }
  } catch (err) {
    console.error('Error ensuring news index:', err);
  }
}

export { connectToClient, ensureNewsIndex };
