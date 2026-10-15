/*
  Admin form validation. Each validator returns { value, errors }: value is the cleaned form
  (trimmed, checkboxes as booleans, unknown fields dropped) and errors is null or a map of
  field name -> message, for showing next to each field.
*/
import Joi from "joi";

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const MESSAGES = {
  "string.empty": "{#label} is required.",
  "any.required": "{#label} is required.",
  "string.max": "{#label} must be {#limit} characters or fewer.",
  "string.min": "{#label} must be at least {#limit} characters.",
  "string.uri": "{#label} must be a full URL, e.g. https://github.com/you/project.",
  "string.uriCustomScheme": "{#label} must be a full URL, e.g. https://github.com/you/project.",
  "string.pattern.base": "{#label} may only contain lowercase letters, numbers and single hyphens.",
};

const OPTIONS = {
  abortEarly: false,
  stripUnknown: true,
  errors: { wrap: { label: false } },
  messages: MESSAGES,
};

// An empty slug means "generate one"
const slug = Joi.string().trim().lowercase().max(80).pattern(SLUG_PATTERN).allow("").label("Slug");

// Checkboxes post "on" when ticked and nothing otherwise
const checkbox = Joi.any().custom((value) => value === "on" || value === true || value === "true");

export const MAX_TAGS = 6;
const TAG_PATTERN = /^[a-z0-9][a-z0-9.+#-]*$/;

// "Node, Discord bot" -> ["node", "discord-bot"]; checked against TAG_PATTERN afterwards
function parseTags(value) {
  if (typeof value !== "string") return [];
  return [
    ...new Set(
      value
        .split(",")
        .map((tag) => tag.trim().toLowerCase().replace(/\s+/g, "-"))
        .filter(Boolean)
    ),
  ];
}

const tags = Joi.any()
  .custom((value, helpers) => {
    const list = parseTags(value);
    if (list.length > MAX_TAGS) return helpers.message(`Use at most ${MAX_TAGS} tags.`);
    const bad = list.find((tag) => tag.length > 20 || !TAG_PATTERN.test(tag));
    if (bad) {
      return helpers.message(
        `“${bad}” isn't a usable tag: up to 20 letters, numbers, or . + # - characters.`
      );
    }
    return list;
  })
  .default([]);

export const PROJECT_STATUSES = ["active", "maintained", "paused", "archived"];

// An empty box means "not set"
const year = Joi.number().integer().min(1990).max(2100).empty("").allow(null).default(null);

const projectSchema = Joi.object({
  name: Joi.string().trim().max(125).required().label("Name"),
  title: Joi.string().trim().max(125).required().label("Title"),
  slug,
  source: Joi.string().trim().max(100).uri({ scheme: ["http", "https"] }).required().label("Source URL"),
  descriptionMarkdown: Joi.string().min(20).max(25000).required().label("Description"),
  tags,
  status: Joi.string()
    .valid("", ...PROJECT_STATUSES)
    .default("")
    .messages({ "any.only": "Pick a status from the list." }),
  startYear: year.label("Started").messages({ "number.base": "Started must be a year, e.g. 2019." }),
  endYear: year
    .label("Ended")
    .when("startYear", { is: Joi.number(), then: Joi.number().min(Joi.ref("startYear")) })
    .messages({
      "number.base": "Ended must be a year, e.g. 2023.",
      "number.min": "Ended can't be before Started.",
    }),
  isPublished: checkbox.default(false),
});

const newsSchema = Joi.object({
  title: Joi.string().trim().max(125).required().label("Title"),
  slug,
  bodyMarkdown: Joi.string().min(10).max(1000).required().label("Body"),
  isPublished: checkbox.default(false),
});

export const MAX_TIMELINE_ENTRIES = 30;

/**
 * The about page's timeline, typed one entry per line as "when | what | detail" (detail is
 * optional). Blank lines are skipped.
 * @returns {Array<{ when: string, what: string, detail: string }>}
 */
export function parseTimeline(text) {
  if (typeof text !== "string") return [];
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [when = "", what = "", ...rest] = line.split("|").map((part) => part.trim());
      return { when, what, detail: rest.join(" | ") };
    });
}

/**
 * The reverse of parseTimeline, for filling the editor.
 */
export function formatTimeline(entries) {
  if (typeof entries === "string") return entries;
  return (entries ?? [])
    .map(({ when, what, detail }) => [when, what, detail].filter(Boolean).join(" | "))
    .join("\n");
}

const timeline = Joi.any()
  .custom((value, helpers) => {
    const entries = parseTimeline(value);
    if (entries.length > MAX_TIMELINE_ENTRIES) {
      return helpers.message(`Use at most ${MAX_TIMELINE_ENTRIES} timeline entries.`);
    }
    const line = entries.findIndex(
      (entry) =>
        !entry.when || !entry.what || entry.when.length > 40 || entry.what.length > 120 || entry.detail.length > 300
    );
    if (line !== -1) {
      return helpers.message(
        `Line ${line + 1}: write it as “when | what | detail”. When is up to 40 characters, what up to 120, detail up to 300.`
      );
    }
    return entries;
  })
  .default([]);

const pageSchema = Joi.object({
  title: Joi.string().trim().max(125).required().label("Title"),
  intro: Joi.string().trim().max(300).allow("").default("").label("Intro"),
  bodyMarkdown: Joi.string().trim().min(1).max(25000).required().label("Body"),
  timeline,
  isPublished: checkbox.default(false),
});

export const HEX_COLOR = /^#[0-9a-f]{6}$/;
export const MAX_HERO_LINES = 8;

/**
 * The home page terminal's lines, typed as "key: value", one per line.
 * @returns {Array<{ key: string, value: string }>}
 */
export function parseHeroLines(text) {
  if (typeof text !== "string") return [];
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const colon = line.indexOf(":");
      return colon === -1
        ? { key: "", value: line }
        : { key: line.slice(0, colon).trim(), value: line.slice(colon + 1).trim() };
    });
}

const accent = Joi.string()
  .trim()
  .lowercase()
  .pattern(HEX_COLOR)
  .allow("")
  .default("")
  .messages({ "string.pattern.base": "{#label} must be a colour like #3ddc84." });

const settingsSchema = Joi.object({
  showBlog: checkbox.default(false),
  accentLight: accent.label("Light theme accent"),
  accentDark: accent.label("Dark theme accent"),
  heroLines: Joi.string()
    .trim()
    .max(1000)
    .allow("")
    .default("")
    .custom((value, helpers) => {
      const lines = parseHeroLines(value);
      if (lines.length > MAX_HERO_LINES) return helpers.message(`Use at most ${MAX_HERO_LINES} lines.`);
      const bad = lines.findIndex((line) => !line.key || line.key.length > 20 || line.value.length > 80);
      if (bad !== -1) {
        return helpers.message(
          `Line ${bad + 1}: write it as “key: value”, with a key of up to 20 characters and a value of up to 80.`
        );
      }
      return value;
    })
    .label("Terminal lines"),
});

function validate(schema, body) {
  const { value, error } = schema.validate(body ?? {}, OPTIONS);
  if (!error) return { value, errors: null };

  const errors = {};
  for (const detail of error.details) {
    const field = detail.path[0];
    errors[field] ??= detail.message;
  }
  return { value, errors };
}

export function validateProjectForm(body) {
  return validate(projectSchema, body);
}

export function validateNewsForm(body) {
  return validate(newsSchema, body);
}

export function validatePageForm(body) {
  return validate(pageSchema, body);
}

export function validateSettingsForm(body) {
  return validate(settingsSchema, body);
}

export default {
  validateProjectForm,
  validateNewsForm,
  validatePageForm,
  validateSettingsForm,
  parseTimeline,
  formatTimeline,
  parseHeroLines,
  SLUG_PATTERN,
};
