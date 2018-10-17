// TODO: write logic to load project details from database

const {Project, validate} = require('../models/projects');
const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const _ = require('lodash');
const session = require('express-session');
const showdown = require('showdown');
const sanitize = require('sanitize-html');
const genNonce = require('../functions/nonce');

let converter = new showdown.Converter();

router.get("/", async (req, res) => {
    let project_list = await listProjects();
    let status = '';
    let type = '';

    if (req.session.success) {
        if (req.session.success === 1) {
            status = success;
            type = 'success';
            req.session.success.destroy();
        }
    }

    res.render("projects", {
        title: "Ryan Malacina | Projects",
        projects: project_list,
        status: status,
        type: type,
    });
});

router.get('/new', auth, async(req, res) => {
    let nonce = genNonce.genNonce();
    genNonce.genCSP(req, res, nonce);
    res.render('new-project', {
        layout: 'new-project',
        new_project: true,
        nonce: nonce
    });
});


router.post('/new', auth, async(req, res) => {

    const { error } = validate(req.body);
    if (error) return res.status(400).render('new-project', {
        layout: 'new-project',
        new_project: true,
        error_message: 'An error has occurred. Please make sure all fields are filled and try again.',
        project_name: req.body.project_name,
        project_title: req.body.project_title,
        project_source: req.body.project_source,
        project_description: req.body.project_description,
        project_image: req.body.project_image,
        nonce: req.app.locals.nonce
    });

    let project = new Project(_.pick(req.body, [
        'project_name', 'project_title', 'project_source', 'project_description', 'project_image'
    ]));

    try {
        await project.save();
    } catch(ex) {
        console.log(ex);
        return res.status(400).render('new-project', {
            layout: 'new-project',
            new_project: true,
            error_message: 'An error has occurred. Please make sure all fields are filled and try again.',
            project_name: req.body.project_name,
            project_title: req.body.project_title,
            project_source: req.body.project_source,
            project_description: req.body.project_description,
            project_image: req.body.project_image
        });
    }
    req.session.project_success = 1;
    res.redirect('/projects');
});

// TODO: this really should use ID to load; we can hide that on the page per row if we load initial
// project listing from the database
router.get("/:name", async(req, res) => {
   const project = await Project.findOne({
       project_name: req.params.name
   });

   if (!project) return res.render("error", {
       error: "It appears as though you are trying to access an invalid project. " +
           "Perhaps try <a href=\"\\projects\">again</a>?"
   });

   res.render("projects", {
       project_title: project.project_title,
       project_source: project.project_source,
       project_description: converter.makeHtml(project.project_description),
       is_valid: true
   });
});

async function listProjects() {
    return Project.find().select({ project_name: 1, project_image: 1, project_title: 1, _id: 0 });
}

module.exports = router;