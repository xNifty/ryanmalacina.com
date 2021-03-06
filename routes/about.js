const express = require('express');
const router = express.Router();

const constants = require('../models/constants');

router.get("/", function(req, res) {
    res.render("about", {
        title: constants.pageHeader.about,
    });
});

module.exports = router;
