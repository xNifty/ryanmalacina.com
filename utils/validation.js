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

const projectSchema = Joi.object({
  name: Joi.string().trim().max(125).required().label("Name"),
  title: Joi.string().trim().max(125).required().label("Title"),
  slug,
  source: Joi.string().trim().max(100).uri({ scheme: ["http", "https"] }).required().label("Source URL"),
  descriptionMarkdown: Joi.string().min(20).max(25000).required().label("Description"),
  tags,
  isPublished: checkbox.default(false),
});

const newsSchema = Joi.object({
  title: Joi.string().trim().max(125).required().label("Title"),
  slug,
  bodyMarkdown: Joi.string().min(10).max(1000).required().label("Body"),
  isPublished: checkbox.default(false),
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

export default { validateProjectForm, validateNewsForm, SLUG_PATTERN };
