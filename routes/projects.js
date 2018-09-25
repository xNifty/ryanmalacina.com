// TODO: write logic to load project details from database

const express = require('express');
const router = express.Router();

router.get("/", function(req, res) {
    res.render("projects", {
        title: "Ryan Malacina | Projects",
    });
});

module.exports = router;