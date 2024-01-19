import express from "express";

import { strings } from "../config/constants.js";

const ROUTER = express.Router();

ROUTER.get("/", function (req, res) {
  res.render("about", {
    title: strings.pageHeader.about,
  });
});

export { ROUTER as aboutRoute };

//module.exports = router;
