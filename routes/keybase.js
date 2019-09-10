const express = require('express');
const router = express.Router();
const constants = require('../models/constants');

router.get("/", function(req, res) {
    res.render("keybase", {
        title: constants.pageHeader.keybase,
        //layout: false
    });
});

module.exports = router;