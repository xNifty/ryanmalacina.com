const {Project, validateProject} = require('../models/projects');
const {News, validateNews} = require('../models/news');
const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const _ = require('lodash');
const session = require('express-session');

const constants = require('../models/constants');

router.get("/", [auth.isLoggedIn, auth.isAdmin], async(req, res) => {
    res.render("admin", {
        title: constants.pageHeader.admin
    });
});

router.get("/projects", [auth.isLoggedIn, auth.isAdmin], async(req, res) => {
    let project_list = await listProjects();

    res.render("admin-projects", {
        title: constants.pageHeader.adminProject,
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
        return res.end('{"fail" : "Server error", "status" : 500}');
    }
});

router.get("/news", [auth.isLoggedIn, auth.isAdmin], async(req, res) => {
    let news_list = await getNewsListing();

    res.render("admin-news", {
        title: constants.pageHeader.adminProject,
        news: news_list,
    });
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

async function getNewsListing() {
    return News.find().select({
        news_title: 1,
        is_published: 1,
        _id: 1
    });
}

module.exports = router;