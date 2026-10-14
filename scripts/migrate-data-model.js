// Migrate projects and news to the October 2026 data model. See scripts/lib/dataModelMigration.js.
//
//   npm run migrate-data-model            # dry run: prints every change, writes nothing
//   npm run migrate-data-model -- --apply # backs up to ./backups, migrates, rebuilds indexes
//
// Deploy the new code and run this together: the old code can't read migrated documents
// and the new code can't read unmigrated ones.
import "dotenv/config";
import mongoose from "mongoose";

import { Project } from "../models/projects.js";
import { News } from "../models/news.js";
import { migrateDataModel } from "./lib/dataModelMigration.js";

const apply = process.argv.includes("--apply");

await mongoose.connect(process.env.mongoURL);

try {
  console.log(apply ? "Applying migration\n" : "Dry run\n");

  await migrateDataModel(mongoose.connection.db, {
    apply,
    projectsCollection: Project.collection.name,
    newsCollection: News.collection.name,
  });

  if (apply) {
    for (const model of [Project, News]) {
      const dropped = await model.syncIndexes();
      console.log(
        `${model.modelName}: indexes rebuilt${dropped.length ? `, dropped ${dropped.join(", ")}` : ""}`
      );
    }
  }
} finally {
  await mongoose.disconnect();
}
