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
const dateformat = require('dateformat');

let converter = new showdown.Converter();

router.get("/", async (req, res) => {
    let project_list = await listProjects();
    let status = '';
    let type = '';
    let message = '';

    if (req.session.success) {
        if (req.session.success === 1) {
            message = req.session.success_message;
            type = 'success';
            req.session.success = null;
            req.session.success_message = null;
        }
    }

    res.render("projects", {
        title: "Ryan Malacina | Projects",
        projects: project_list,
        status: status,
        type: type,
        message: message,
    });
});

router.get('/new', [auth], async(req, res) => {
    res.render('new-project', {
        layout: 'new-project',
        new_project: true,
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
        project_image: req.body.project_image
    });

    let project = new Project(_.pick(req.body, [
        'project_name', 'project_title', 'project_source', 'project_image'
    ]));

    let pDescription = converter.makeHtml(req.body.project_description);
    let pSanitized = sanitize(pDescription, { allowedTags: sanitize.defaults.allowedTags.concat(['h1']) });
    project.project_description_markdown = req.body.project_description;
    project.project_description_html = pSanitized;
    let saveDate = new Date(Date.now());

    try {
        await project.save();
    } catch(ex) {
        return res.status(400).render('new-project', {
            layout: 'new-project',
            new_project: true,
            error_message: 'An error has occurred. Please make sure all fields are filled and try again #2.',
            project_name: req.body.project_name,
            project_title: req.body.project_title,
            project_source: req.body.project_source,
            project_description: req.body.project_description,
            project_image: req.body.project_image,
	    last_edited: saveDate
        });
    }
    req.session.success = 1;
    req.session.success_message = "Project added successfully";
    res.redirect('/projects');
});

router.get('/:name/edit', [auth], async(req, res) => {
    const project = await Project.findOne({
        project_name: req.params.name
    });

    req.session.project_id = project._id;

    let error_message = req.session.error_message;
    req.session.error_message = null;

    res.render('new-project', {
        layout: 'new-project',
        update_project: true,
        project_name: project.project_name,
        project_title: project.project_title,
        project_source: project.project_source,
        project_description: project.project_description_markdown,
        project_image: project.project_image,
        error_message: error_message
    });
});

router.post('/edit', auth, async(req, res) => {
    try {
	let pDescription = converter.makeHtml(req.body.project_description);
	let pSanitized = sanitize(pDescription, { allowedTags: sanitize.defaults.allowedTags.concat(['h1']) });
	let saveDate = new Date(Date.now());

        let project = await Project.findByIdAndUpdate({_id: req.session.project_id}, {
            project_name: req.body.project_name,
            project_title: req.body.project_title,
            project_source: req.body.project_source,
            project_description_markdown: req.body.project_description,
            project_description_html: pSanitized,
            project_image: req.body.project_image,
	    last_edited: saveDate
        });
        req.session.success = 1;
        req.session.success_message = "Project edited successfully";
        req.session.project_id = null;

	if (req.session.projectReturnTo) {
            var returnTo = req.session.projectReturnTo;
	    delete req.session.projectReturnTo;
            return res.redirect(returnTo);
        } else {
            return res.redirect('/projects');
        }
    } catch(ex) {
        req.session.error_message = 'Something went wrong; please try again.';
        if (req.session.projectReturnTo) {
            var returnTo = req.session.projectReturnTo;
            delete req.session.projectReturnTo;
            return res.redirect(returnTo);
        } else {
            return res.redirect('/projects');
        }

    }

});

// TODO: this really should use ID to load; we can hide that on the page per row if we load initial
// project listing from the database
router.get("/:name", async(req, res) => {
   const project = await Project.findOne({
       project_name: req.params.name
   });

   let status = '';
   let type = '';
   let message = '';

   if (req.session.success) {
       if (req.session.success === 1) {
           message = req.session.success_message;
           type = 'success';
           delete req.session.success;
           delete req.session.success_message;
       }
   }

   req.session.projectReturnTo = req.originalUrl;

   if (!project) return res.render("error", {
       error: "It appears as though you are trying to access an invalid project. " +
           "Perhaps try <a href=\"\\projects\">again</a>?"
   });

   res.render("projects", {
       project_title: project.project_title,
       project_source: project.project_source,
       project_description: project.project_description_html,
       project_name: project.project_name,
       is_valid: true,
       status: status,
       type: type,
       message: message,
       last_save_date: dateformat(project.last_edited, "mmmm dd, yyyy @ h:MM TT")
   });
});

async function listProjects() {
    return Project.find().select({ project_name: 1, project_image: 1, project_title: 1, _id: 0 });
}

module.exports = router;
