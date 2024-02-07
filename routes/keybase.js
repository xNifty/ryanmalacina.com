import express from "express";
import { strings } from "../config/constants.js";

const router = express.Router();

router.get("/", function (req, res) {
  res.render("keybase", {
    title: strings.pageHeader.keybase,
    //layout: false
  });
});

export { router as keybaseRoute };
