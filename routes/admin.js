const {Project, validate} = require('../models/projects');
const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const _ = require('lodash');
const session = require('express-session');

router.get("/", [auth.isLoggedIn, auth.isAdmin], async(req, res) => {
    res.render("admin", {
        title: "Ryan Malacina | Admin Backend"
    });
});

router.get("/projects", [auth.isLoggedIn, auth.isAdmin], async(req, res) => {
    let project_list = await listProjects();

    res.render("admin-projects", {
        title: "Ryan Malacina | Admin Backend - Projects",
        projects: project_list,
    });
});

async function listProjects() {
    return Project.find().select({
        project_name: 1,
        project_image: 1,
        project_title: 1,
        is_published: 1,
        _id: 0
    });
}

module.exports = router;
