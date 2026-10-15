/*
  The standalone pages: /about, /now and /uses, written in markdown at /admin/pages.

  Each page starts from the content below until it's first saved. About starts published (it
  replaces the old hard-coded page); now and uses start as drafts. The nav and footer read
  which pages are published on every request, so they're cached like settings.
*/
import { Page } from "../models/page.js";
import logErrorToFile from "../utils/errorLogging.js";

const CACHE_MS = 60 * 1000;

export const PAGES = {
  about: {
    path: "/about",
    label: "About",
    prompt: "cat about.md",
    hasTimeline: true,
    defaults: {
      title: "About me",
      intro: "",
      isPublished: true,
      timeline: [],
      bodyMarkdown: [
        "Hey there, I'm Ryan, and welcome to my site!",
        "",
        "This site is dedicated to maintaining an up to date listing of all projects that I am currently working on, whether as a personal project or a project that I am actively contributing to.",
        "",
        "You can follow along with the site's development [on GitHub](https://github.com/xnifty/ryanmalacina.com).",
      ].join("\n"),
    },
  },
  now: {
    path: "/now",
    label: "Now",
    prompt: "cat now.md",
    showUpdated: true,
    defaults: {
      title: "What I'm doing now",
      intro: "What I'm focused on at the moment.",
      isPublished: false,
      timeline: [],
      bodyMarkdown: [
        "## Working on",
        "",
        "- ",
        "",
        "## Learning",
        "",
        "- ",
        "",
        "## Reading and playing",
        "",
        "- ",
      ].join("\n"),
    },
  },
  uses: {
    path: "/uses",
    label: "Uses",
    prompt: "cat uses.md",
    defaults: {
      title: "Uses",
      intro: "The hardware, software and tools I use day to day.",
      isPublished: false,
      timeline: [],
      bodyMarkdown: [
        "## Editor and terminal",
        "",
        "- ",
        "",
        "## Hardware",
        "",
        "- ",
        "",
        "## This site",
        "",
        "- Express 5 and Handlebars, with htmx for the interactive bits",
        "- MongoDB",
        "- Hand-written CSS, no framework",
        "- [Source on GitHub](https://github.com/xNifty/ryanmalacina.com)",
      ].join("\n"),
    },
  },
};

export const PAGE_KEYS = Object.keys(PAGES);

let cached = null;
let cachedAt = 0;

function withDefaults(key, stored) {
  const { defaults, ...meta } = PAGES[key];
  return {
    key,
    ...meta,
    ...defaults,
    ...(stored && {
      title: stored.title,
      intro: stored.intro ?? "",
      bodyMarkdown: stored.bodyMarkdown,
      timeline: stored.timeline ?? [],
      isPublished: stored.isPublished,
      updatedAt: stored.updatedAt,
    }),
    saved: Boolean(stored),
  };
}

/**
 * Every page, saved or not, in PAGES order.
 * @returns {Promise<Object[]>}
 */
export async function listPages() {
  if (cached && Date.now() - cachedAt < CACHE_MS) return cached;

  let stored;
  try {
    stored = await Page.find({ _id: { $in: PAGE_KEYS } }).lean();
  } catch (err) {
    // The nav reads this on every page; fall back to the defaults rather than fail
    logErrorToFile(err);
    return PAGE_KEYS.map((key) => withDefaults(key, null));
  }

  const byKey = new Map(stored.map((page) => [page._id, page]));
  cached = PAGE_KEYS.map((key) => withDefaults(key, byKey.get(key)));
  cachedAt = Date.now();
  return cached;
}

/**
 * @param {string} key - about | now | uses
 * @returns {Promise<Object|null>} - null for an unknown key
 */
export async function getPage(key) {
  if (!Object.hasOwn(PAGES, key)) return null;
  return (await listPages()).find((page) => page.key === key);
}

/**
 * Paths and labels of the published pages, for the nav and footer.
 * @returns {Promise<Object<string, { path: string, label: string }>>} - keyed by page key
 */
export async function publishedPages() {
  const pages = await listPages();
  return Object.fromEntries(
    pages.filter((page) => page.isPublished).map((page) => [page.key, { path: page.path, label: page.label }])
  );
}

/**
 * Save validated editor data.
 * @param {string} key
 * @param {{ title, intro, bodyMarkdown, timeline, isPublished }} data
 */
export async function savePage(key, data) {
  if (!Object.hasOwn(PAGES, key)) throw new Error(`Unknown page: ${key}`);
  await Page.updateOne(
    { _id: key },
    {
      $set: {
        title: data.title,
        intro: data.intro ?? "",
        bodyMarkdown: data.bodyMarkdown,
        timeline: PAGES[key].hasTimeline ? data.timeline ?? [] : [],
        isPublished: Boolean(data.isPublished),
      },
    },
    { upsert: true, runValidators: true }
  );
  clearPagesCache();
  return getPage(key);
}

export function clearPagesCache() {
  cached = null;
  cachedAt = 0;
}

export default { PAGES, PAGE_KEYS, listPages, getPage, publishedPages, savePage, clearPagesCache };
