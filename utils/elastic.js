import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { Client } = require("@elastic/elasticsearch");

const client = new Client({
  node: "http://localhost:9200",
});

export default client;
