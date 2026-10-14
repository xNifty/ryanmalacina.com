import path from "path";
import fileUpload from "express-fileupload";

import { strings } from "../config/constants.js";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Extension -> expected mimetype and a check against the file's leading bytes,
// so a renamed .html/.svg can't be dropped into public/images
const IMAGE_TYPES = {
  ".png": { mime: "image/png", matches: (b) => b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) },
  ".jpg": { mime: "image/jpeg", matches: (b) => b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) },
  ".jpeg": { mime: "image/jpeg", matches: (b) => b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) },
  ".gif": { mime: "image/gif", matches: (b) => b.subarray(0, 4).toString("ascii") === "GIF8" },
  ".webp": {
    mime: "image/webp",
    matches: (b) =>
      b.subarray(0, 4).toString("ascii") === "RIFF" &&
      b.subarray(8, 12).toString("ascii") === "WEBP",
  },
};

/**
 * Validate an uploaded image and build a safe, unique file name for it
 * @param {Object} file - The express-fileupload file object
 * @returns {{ fileName?: string, error?: string }}
 */
export function prepareImageUpload(file) {
  if (!file || Array.isArray(file)) {
    return { error: strings.errors.imageInvalid };
  }

  if (file.truncated || file.size > MAX_IMAGE_BYTES) {
    return { error: strings.errors.imageTooLarge };
  }

  const ext = path.extname(file.name || "").toLowerCase();
  const type = IMAGE_TYPES[ext];

  if (!type || file.mimetype !== type.mime || !type.matches(file.data)) {
    return { error: strings.errors.imageInvalid };
  }

  const base =
    path
      .basename(file.name, path.extname(file.name))
      .replace(/[^a-z0-9_-]+/gi, "-")
      .slice(0, 80) || "image";

  return { fileName: `${base}-${Date.now()}${ext}` };
}

/**
 * Multipart parsing for image uploads: puts files on req.files and fields on req.body.
 * Files over the limit arrive with truncated: true, which prepareImageUpload rejects.
 * app.js runs this before CSRF checking so the form's _csrf field can be read.
 */
export const parseUploads = fileUpload({ limits: { fileSize: MAX_IMAGE_BYTES } });

export default { prepareImageUpload, parseUploads, MAX_IMAGE_BYTES };
