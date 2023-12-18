import express from "express";
import { pageHeader } from "../config/constants.js";

const router = express.Router();

router.get("/", function (req, res) {
  res.render("keybase", {
    title: pageHeader.keybase,
    //layout: false
  });
});

export { router as keybaseRoute };
