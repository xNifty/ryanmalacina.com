/*
  Status of the services the site depends on, for the admin dashboard.
*/
import mongoose from "mongoose";

import { listRecentPosts } from "./blog.js";
import { getSettings } from "./settings.js";

const GHOST_TIMEOUT_MS = 3000;

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`no response after ${ms / 1000}s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function checkGhost() {
  if (!(await getSettings()).showBlog) {
    return { name: "Blog (Ghost)", status: "off", detail: "Switched off in Settings" };
  }
  try {
    await withTimeout(listRecentPosts(), GHOST_TIMEOUT_MS);
    return { name: "Blog (Ghost)", status: "ok", detail: "Reachable" };
  } catch (err) {
    return { name: "Blog (Ghost)", status: "error", detail: err.message };
  }
}

/**
 * @returns {Promise<Array<{ name: string, status: "ok"|"error"|"off", detail: string }>>}
 */
export async function checkHealth() {
  const database =
    mongoose.connection.readyState === 1
      ? { name: "Database", status: "ok", detail: `Connected to ${mongoose.connection.name}` }
      : { name: "Database", status: "error", detail: "Not connected" };

  const missingMail = ["mailgunAPI", "mailgunDomain", "mailgunFromEmail", "mailgunToEmail"].filter(
    (key) => !process.env[key]
  );
  const mail = missingMail.length
    ? { name: "Email (Mailgun)", status: "error", detail: `Missing ${missingMail.join(", ")}` }
    : { name: "Email (Mailgun)", status: "ok", detail: `Sending as ${process.env.mailgunFromEmail}` };

  return [database, mail, await checkGhost()];
}

export default { checkHealth };
