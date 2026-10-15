/*
  Which commit is running, for the footer. Read once at startup: from GIT_COMMIT (or the
  SOURCE_VERSION some hosts set) when deployed without a .git directory, else from git itself.
*/
import { execFileSync } from "child_process";

const GITHUB_REPO = "https://github.com/xNifty/ryanmalacina.com";

/**
 * @returns {{ commit: string, short: string, date: Date|null, url: string } | null}
 */
export function getBuildInfo(env = process.env) {
  let commit = env.GIT_COMMIT || env.SOURCE_VERSION || "";
  let date = env.GIT_COMMIT_DATE ? new Date(env.GIT_COMMIT_DATE) : null;

  if (!commit) {
    try {
      const output = execFileSync("git", ["log", "-1", "--format=%H %cI"], {
        encoding: "utf8",
        timeout: 2000,
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      const [hash, iso] = output.split(" ");
      commit = hash;
      date = iso ? new Date(iso) : null;
    } catch {
      return null;
    }
  }

  if (!/^[0-9a-f]{7,40}$/i.test(commit)) return null;
  return {
    commit,
    short: commit.slice(0, 7),
    date: date && !Number.isNaN(date.getTime()) ? date : null,
    url: `${GITHUB_REPO}/commit/${commit}`,
  };
}

export default getBuildInfo;
