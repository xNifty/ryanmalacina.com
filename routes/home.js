const express = require('express');
const router = express.Router();
const csp = require('../middleware/nonce');

router.get("/", csp.genCSP, async (req, res) => {

    if (req.user) {
        return res.render("index", {
            title: "Ryan Malacina | Home",
            name: req.user.realName
        });
    } else {
        return res.render("index", {
            title: "Ryan Malacina | Home",
        });
    }
});

module.exports = router;
