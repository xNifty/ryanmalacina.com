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
    if (await publishProject(id)) {
        return res.end('{"success" : "Updated Successfully", "status" : 200}');
    } else {
        return res.end('{"success" : "Server error", "status" : 500}');
    }
});

router.put("/projects/unpublish/:id", [auth.isAdmin, auth.isLoggedIn], async(req, res) => {
    let id = req.params.id;
    if (await unpublishProject(id)) {
        return res.end('{"success" : "Updated Successfully", "status" : 200}');
    } else {
        return res.end('{"success" : "Server error", "status" : 500}');
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
    try {
        await Project.findByIdAndUpdate({_id: id}, {
            is_published: true
        });
        return true;
    } catch(err) {
        console.log(err);
        return false;
    }
}

async function unpublishProject(id) {
    try {
        await Project.findByIdAndUpdate({_id: id}, {
            is_published: false
        });
        return true;
    } catch(err) {
        console.log(err);
        return false;
    }
}

module.exports = router;