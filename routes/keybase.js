import express from "express";
import { strings } from "../config/constants.js";

const ROUTER = express.Router();

ROUTER.get("/", function (req, res) {
  res.render("keybase", {
    title: strings.pageHeader.keybase,
    //layout: false
  });
});

export { ROUTER as keybaseRoute };
