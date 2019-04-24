const express = require('express');
const router = express.Router();
const {Project, validate} = require('../models/projects');
const mongoose = require('mongoose');

router.get("/", async (req, res) => {
    let project_list = await listProjects();

    if (req.user) {
        return res.render("index", {
            title: "Ryan Malacina | Home",
            name: req.user.realName,
            projects: project_list
        });
    } else {
        return res.render("index", {
            title: "Ryan Malacina | Home",
            projects: project_list
        });
    }
});

router.post('/send', async(req, res) => {
   // Handle all of the mail sending stuff, and then update tha entire div to say thank you
   console.log("Mail should have been sent.");
   return true;
});

async function listProjects() {
    return Project.find({is_published: 1}).select({
        project_name: 1,
        project_image: 1,
        project_title: 1,
        _id: 0
    }).limit(4);
}

module.exports = router;
