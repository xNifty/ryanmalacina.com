// TODO: write logic to load project details from database

const {Project} = require('../models/projects');
const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

router.get("/", function(req, res) {
    res.render("projects", {
        title: "Ryan Malacina | Projects",
    });
});

router.get('/new', auth, async(req, res) => {
    res.render('project-new-template');
});

// TODO: this really should use ID to load; we can hide that on the page per row if we load initial
// project listing from the database
router.get("/:name", async(req, res) => {
   const project = await Project.findOne({
       name: req.params.name
   });

   if (!project) return res.render("error", {
       error: "It appears as though you are trying to access an invalid project. " +
           "Perhaps try <a href=\"\\projects\">again</a>?"
   });

   res.render("projects", {
       project_title: project.title,
       project_source: project.source,
       project_description: project.description,
       is_valid: true
   });
});

module.exports = router;