// TODO: write logic to load project details from database

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Project = mongoose.model('Project', new mongoose.Schema({
    title: String,
    source: String,
    description: String
}));

router.get("/", function(req, res) {
    res.render("projects", {
        title: "Ryan Malacina | Projects",
    });
});

router.get("/:name", async(req, res) => {
   const project = await Project.find({
       name: req.params.name
   });
   if (!project) return res.status(404).send("Sorry, this project doesn't exist.");
   res.render("project", {
      project_title: project.title,
      project_source: project.source,
      project_description: project.description
   });
});

module.exports = router;