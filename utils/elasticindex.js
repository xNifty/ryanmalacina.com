// Functionality for automatically indexing MongoDB schemas into Elastic
// More documentation to come
// TODO: Write functionality
// TODO Document the code
//

function ElasticIndex(client, opts = {}) {
  return (schema, index) => {
    CreateElasticIndex(client, schema, index, opts);
  }

  //console.log("ElasticIndex");
}

function CreateElasticIndex(client, schema, index, opts = {}) {
  console.log("TODO: Write functionality for elasticIndex");

  if (!client) return;

  // Create mappings
  CreateIndex(client, index);
  GetMapping(schema, opts);
}

// Create index and mapping
async function CreateIndex(client, index, schema) {
  try {
    const indexExists = await client.indices.exists({ index });
    if (!indexExists) {
      await client.indices.create({ index: index });

      //if schema {
      //
      //}
      console.log("Created index: ", index);
    } else {
      console.log("Index already existed: ", index);
    }
  } catch (error) {
    console.log(error);
  }
}

async function GetMapping(schema, opts) {
  const props = {};

  for (let i = 0; i < Object.keys(schema.paths).length; i++) {
    const key = Object.keys(schema.paths)[i];

    const excludes = ["id", "__v", "_id"];
    if (excludes.includes(key)) continue;
    if (opts && opts.ignore && opts.ignore.includes(key)) continue;

    const type = schema.paths[key].instance;

    if (schema.paths[key].options.es_mapping) {
      props[key] = schema.paths[key].options.es_mapping;
    }

    const esType = convertType(type, { schema, key });

    if (esType) {
      props[key] = esType;
    }
  }

  return { properties: props };
}

function convertType(type, { schema, key }) {
  switch (type) {
    case "ObjectId":
    case "String":
      return { type: "text", fields: { keyword: { type: "keyword" } } };
    case "Date":
      return { type: "date" };
    case "Number":
      return { type: "long" };
    case "Boolean":
      return { type: "boolean" };
    case "Array":
      if (!schema || !key) { console.log("Schema or key not provided for array type"); break; }
      if (schema.paths[key].instance === "String") {
        return { type: "text", fields: { keyword: { type: "keyword" } } };
      }
      const newSchema = schema.paths[key].schema;
      if (!newSchema) break;
      return { type: "nested", properties: GetMapping(newSchema).properties };
    default:
      console.log("Type not found: ", type);
      break;
  }
}

export default ElasticIndex;
