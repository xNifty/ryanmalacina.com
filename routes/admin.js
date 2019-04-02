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
    res.render("admin-projects", {
        title: "Ryan Malacina | Admin Backend - Projects",
    });
});

router.put("/projects/api/publish/:id", [auth.isAdmin, auth.isLoggedIn], async(req, res) => {
   let id = req.params.id;
   try {
       await publishProject(id);
   } catch (e) {
       console.log(e);
   }
});

router.put("/projects/api/unpublish/:id", [auth.isAdmin, auth.isLoggedIn], async(req, res) => {
    let id = req.params.id;
    try {
        await unpublishProject(id);
    } catch (e) {
        console.log(e);
    }
});

router.get("/projects/api/get", [auth.isAdmin, auth.isLoggedIn], async(req, res) => {
    return await listProjects('', function(err, prj) {
        if (err) {
            console.log(err);
        }
        res.render('partials/api-getprojects', {
            layout: false,
            projects: prj
        });
    });
});

async function listProjects({}, callback) {
    return Project.find().
    exec(function(err, prj) {
        prj.reverse();
        callback(err, prj);
    });
}

async function publishProject(id) {
    await Project.findByIdAndUpdate({_id: id}, {
        is_published: true
    });

    return success;
}

async function unpublishProject(id) {
    await Project.findByIdAndUpdate({_id: id}, {
        is_published: false,
    });

    return success;
}

module.exports = router;
