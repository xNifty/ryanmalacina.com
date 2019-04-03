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

router.put("/projects/publish/:id", [auth.isAdmin, auth.isLoggedIn], async(req, res) => {
    let id = req.params.id;
    try {
        await publishProject(id);
    } catch (e) {
        console.log(e);
    }
});

router.put("/projects/unpublish/:id", [auth.isAdmin, auth.isLoggedIn], async(req, res) => {
    let id = req.params.id;
    try {
        await unpublishProject(id);
    } catch (e) {
        console.log(e);
    }
});

async function listProjects() {
    return Project.find().select({
        project_name: 1,
        project_image: 1,
        project_title: 1,
        is_published: 1,
        _id: 1
    });
}

async function publishProject(id) {
    await Project.findByIdAndUpdate({_id: id}, {
        is_published: true
    });
}

async function unpublishProject(id) {
    await Project.findByIdAndUpdate({_id: id}, {
        is_published: false
    });
}

module.exports = router;