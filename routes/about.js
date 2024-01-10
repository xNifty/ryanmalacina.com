import express from "express";

import { pageHeader } from "../config/constants.js";

const router = express.Router();

router.get("/", function (req, res) {
  res.render("about", {
    title: pageHeader.about,
  });
});

export { router as aboutRoute };

//module.exports = router;
