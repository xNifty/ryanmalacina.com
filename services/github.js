/*
  Live repository details (stars, language, last push) for projects whose source is on GitHub.

  Cached in memory for an hour. A stale entry is served straight away and refreshed in the
  background, so only the first visit after a restart waits on GitHub, and then for at most
  TIMEOUT_MS. Failures are cached briefly too, so a GitHub outage or rate limit doesn't slow
  every page. Set GitHubAuth to a token to lift the 60-requests-an-hour anonymous limit.
*/
import logErrorToFile from "../utils/errorLogging.js";

const TTL_MS = 60 * 60 * 1000;
const FAILURE_TTL_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 2500;

const cache = new Map();

/**
 * "https://github.com/xNifty/repo(.git)(/...)" -> "xNifty/repo"; null for anything else.
 */
export function parseRepo(url) {
  if (typeof url !== "string") return null;
  const match = url.trim().match(/^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/?#].*)?$/i);
  return match ? `${match[1]}/${match[2]}` : null;
}

// A token GitHub has rejected; public repos don't need one, so stop sending it
let rejectedToken = null;

function token() {
  const value = process.env.GitHubAuth;
  // The example env file has a placeholder with a space in it
  return value && !/\s/.test(value) && value !== rejectedToken ? value : null;
}

function request(repo, auth, signal) {
  return fetch(`https://api.github.com/repos/${repo}`, {
    signal,
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "ryanmalacina.com",
      ...(auth && { Authorization: `Bearer ${auth}` }),
    },
  });
}

async function fetchRepo(repo) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const auth = token();
    let response = await request(repo, auth, controller.signal);
    if (response.status === 401 && auth) {
      rejectedToken = auth;
      logErrorToFile(new Error("GitHub rejected the GitHubAuth token (expired?); using anonymous requests"));
      response = await request(repo, null, controller.signal);
    }
    if (!response.ok) throw new Error(`GitHub returned ${response.status} for ${repo}`);
    const data = await response.json();
    return {
      stars: data.stargazers_count ?? 0,
      language: data.language ?? null,
      pushedAt: data.pushed_at ? new Date(data.pushed_at) : null,
      archived: Boolean(data.archived),
      url: data.html_url ?? `https://github.com/${repo}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

function refresh(repo) {
  const entry = cache.get(repo) ?? {};
  if (entry.pending) return entry.pending;

  const pending = fetchRepo(repo)
    .then((stats) => {
      cache.set(repo, { stats, expires: Date.now() + TTL_MS });
      return stats;
    })
    .catch((err) => {
      if (err.name !== "AbortError") logErrorToFile(err);
      // Keep serving what we had, but don't ask again for a while
      cache.set(repo, { stats: entry.stats ?? null, expires: Date.now() + FAILURE_TTL_MS });
      return entry.stats ?? null;
    });

  cache.set(repo, { ...entry, pending });
  return pending;
}

/**
 * @param {string} sourceUrl - A project's source URL
 * @returns {Promise<Object|null>} - { stars, language, pushedAt, archived, url }
 */
export async function getRepoStats(sourceUrl) {
  const repo = parseRepo(sourceUrl);
  if (!repo) return null;

  const entry = cache.get(repo);
  if (entry && "stats" in entry) {
    if (Date.now() > entry.expires) refresh(repo);
    return entry.stats;
  }
  return refresh(repo);
}

/**
 * Copies of the projects with a `github` field added (null when unavailable).
 * @param {Object[]} projects - Plain objects with a `source`
 */
export async function withRepoStats(projects) {
  const stats = await Promise.all(projects.map((project) => getRepoStats(project.source)));
  return projects.map((project, i) => ({ ...project, github: stats[i] }));
}

export function clearRepoCache() {
  cache.clear();
  rejectedToken = null;
}

export default { parseRepo, getRepoStats, withRepoStats, clearRepoCache };
