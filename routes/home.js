const express = require('express');
const router = express.Router();
const csp = require('../middleware/nonce');

router.get("/", csp.genCSP, async (req, res) => {
    return res.render("index", {
        title: "Ryan Malacina | Home",
        name: req.session.name,
    });
});

module.exports = router;
