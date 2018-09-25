const express = require('express');
const router = express.Router();

router.get("/", function(req, res) {
    res.render("index", {
        title: "Ryan Malacina | Home",
    });
});

module.exports = router;