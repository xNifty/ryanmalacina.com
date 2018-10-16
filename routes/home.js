const express = require('express');
const router = express.Router();
const session = require('express-session');

router.get("/", async (req, res) => {
    console.log(req.session);
    return res.render("index", {
        title: "Ryan Malacina | Home",
        name: req.session.name
    });
});

module.exports = router;