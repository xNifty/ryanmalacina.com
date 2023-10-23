import express from 'express';
import { constants } from '../config/constants.js'

const router = express.Router();

router.get("/", function(req, res) {
    res.render("about", {
        title: constants.pageHeader.about,
    });
});

export { router as aboutRoute }

//module.exports = router;
