import express from "express";
import { constants } from "../config/constants.js";

const router = express.Router();

router.get("/", function (req, res) {
  res.render("keybase", {
    title: constants.pageHeader.keybase,
    //layout: false
  });
});

export { router as keybaseRoute };
