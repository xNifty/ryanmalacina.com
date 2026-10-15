/*
  Markdown rendering for projects and news.

  Projects: markdown-it with server-side highlight.js. The stored HTML is sanitised to a
  tag allow-list; the public project page re-renders from markdown so code keeps its
  highlighting markup (markdown-it escapes raw HTML, so that path is safe too).

  News: plain markdown-it, sanitised with sanitize-html's defaults plus h1 and img, and a
  tags-stripped copy for text search.
*/
import markdownit from "markdown-it";
import sanitize from "sanitize-html";
// The full build: every highlight.js language is available for fenced code blocks
import hljs from "highlight.js";

import logErrorToFile from "../utils/errorLogging.js";

const projectMarkdown = markdownit({
  highlight: function(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (err) {
        // simply log error and move on
        logErrorToFile(err);
      }
    }
    return "";
  },
});

const newsMarkdown = markdownit();

const PROJECT_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "p", "a", "ul", "ol", "nl", "li",
  "b", "i", "strong", "em", "strike", "code", "hr", "br",
  "table", "thead", "caption", "tbody", "tr", "th", "td", "pre",
];

const NEWS_TAGS = sanitize.defaults.allowedTags.concat(["h1", "img"]);

/**
 * Highlighted HTML for the public project page
 */
export function renderProjectPage(markdown) {
  return projectMarkdown.render(markdown);
}

/**
 * HTML for the about, now and uses pages. The same pipeline as the project page: raw HTML in
 * the markdown is escaped, and fenced code is highlighted.
 */
export function renderPage(markdown) {
  return projectMarkdown.render(markdown);
}

/**
 * Sanitised HTML stored alongside a project's markdown
 */
export function renderProjectHtml(markdown) {
  return sanitize(projectMarkdown.render(markdown), { allowedTags: PROJECT_TAGS });
}

/**
 * @returns {{ html: string, text: string }} - Sanitised HTML and a tags-stripped copy for search
 */
export function renderNews(markdown) {
  const rendered = newsMarkdown.render(markdown);
  return {
    html: sanitize(rendered, { allowedTags: NEWS_TAGS }),
    text: sanitize(rendered, { allowedTags: [] }),
  };
}

export default { renderProjectPage, renderPage, renderProjectHtml, renderNews };
