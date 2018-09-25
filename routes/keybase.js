const express = require('express');
const router = express.Router();

router.get("/", function(req, res) {
    res.render("keybase", {
        title: "Ryan Malacina | Keybase Identity",
        //layout: false
    });
});

module.exports = router;