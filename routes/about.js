import express from "express";

import { strings } from "../config/constants.js";

const router = express.Router();

router.get("/", function (req, res) {
  res.render("about", {
    title: strings.pageHeader.about,
  });
});

export { router as aboutRoute };

//module.exports = router;
