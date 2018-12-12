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
const fileUpload = require('express-fileupload');

let converter = new showdown.Converter();

router.use(fileUpload());

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
        project_image: req.files.project_image.name
    });

    let project = new Project(_.pick(req.body, [
        'project_name', 'project_title', 'project_source'
    ]));

    let pDescription = converter.makeHtml(req.body.project_description);
    let pSanitized = sanitize(pDescription, { allowedTags: sanitize.defaults.allowedTags.concat(['h1']) });
    let pImage = req.files.project_image;
    project.project_description_markdown = req.body.project_description;
    project.project_description_html = pSanitized;
    project.project_image = pImage.name; // File name, nothing else
    let saveDate = new Date(Date.now());

    try {
        await pImage.mv('./public/images/' + pImage.name);
        await project.save();
    } catch(ex) {
        console.log(ex);
        return res.status(400).render('new-project', {
            layout: 'new-project',
            new_project: true,
            error_message: 'An error has occurred. Please make sure all fields are filled and try again #2.',
            project_name: req.body.project_name,
            project_title: req.body.project_title,
            project_source: req.body.project_source,
            project_description: req.body.project_description,
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

    // For if the edit fails, otherwise we want to return to the normal project information page
    req.session.projectEditReturnTo = req.originalUrl;

    let error_message = req.session.error_message;
    req.session.error_message = null;

    // If not load from session, then load normally; else, load from session
    if (!req.session.loadProjectFromSession) {
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
    } else {
        res.render('new-project', {
            layout: 'new-project',
            update_project: true,
            project_name: req.session.project_name,
            project_title: req.session.project_title,
            project_source: req.session.project_source,
            project_description: req.session.project_description_markdown,
            project_image: req.session.project_image,
            error_message: error_message
        });
        delete req.session.loadProjectFromSession;
        delete req.session.project_name;
        delete req.session.project_title;
        delete req.session.project_source;
        delete req.session.project_description_markdown
        delete req.session.project_image;
    }
});

router.post('/edit', auth, async(req, res) => {
    let currentImage = await Project.find({_id: req.session.project_id}).select(
        { project_image: 1, _id: 0 });

    try {
        const { error } = validate(req.body);
        if (error) {
            for (let i = 0; i < error.details.length; i++) {
                console.log(error.details[i].context.key);
                if (error.details[i].context.key === 'project_description')
                    throw new Error("The project description must be at least 20 characters in length.");
            }
        }

        let pDescription = converter.makeHtml(req.body.project_description);

        // We want to allow the h1 tag in our sanitizing
        let pSanitized = sanitize(pDescription, { allowedTags: sanitize.defaults.allowedTags.concat(['h1']) });
        let saveDate = new Date(Date.now());
        let pImage = '';

        // @TODO : CLEAN ALL OF THIS UP; THIS IS UGLY
        try {
            pImage = req.files.project_image;
        } catch (ex) {
            pImage = '';
        }

        // If no image is selected, set it to the existing image; otherwise, error because we need an image
        if (!pImage) {
            if (currentImage[0].project_image) {
                pImage = currentImage[0].project_image;
                await Project.findByIdAndUpdate({_id: req.session.project_id}, {
                    project_name: req.body.project_name,
                    project_title: req.body.project_title,
                    project_source: req.body.project_source,
                    project_description_markdown: req.body.project_description,
                    project_description_html: pSanitized,
                    project_image: pImage,
                    last_edited: saveDate
                });
            }
            else {
                throw new Error("You must upload an image.")
            }
        } else {
            // Only move if the image has a different name; unique names only, not that hard
            // @TODO : really should limit file sizes to the ideal image size of 263x263
            if (pImage.name === currentImage[0].project_image) { // Boy, this is just dumb
                throw new Error("Please make sure file names are unique.  If you've already uploaded " +
                    "this image, you do not need to upload it again.");
            } else {
                // Not the same, so move it!
                // This condition is only ever going to be met if it's a new image, but maybe should add some security
                // to this later on, just in case
                await pImage.mv('./public/images/' + pImage.name);
                await Project.findByIdAndUpdate({_id: req.session.project_id}, {
                    project_name: req.body.project_name,
                    project_title: req.body.project_title,
                    project_source: req.body.project_source,
                    project_description_markdown: req.body.project_description,
                    project_description_html: pSanitized,
                    project_image: pImage.name,
                    last_edited: saveDate
                });
            }
        }

        req.session.success = 1;
        req.session.success_message = "Project edited successfully!";
        req.session.project_id = null;

        if (req.session.projectReturnTo) {
            let returnTo = req.session.projectReturnTo;
            delete req.session.projectReturnTo;
            delete req.session.projectEditReturnTo; // Still need to delete even though we didn't use it
            return res.redirect(returnTo);
        } else {
            return res.redirect('/projects');
        }
    } catch(ex) {
        // @TODO: So this is hacky and should be redone later
        req.session.loadProjectFromSession = true;
        req.session.project_name = req.body.project_name;
        req.session.project_title = req.body.project_title;
        req.session.project_source = req.body.project_source;
        req.session.project_description_markdown = req.body.project_description;
        req.session.project_image = currentImage[0].project_image;

        req.session.error_message = ex.message;
        if (req.session.projectReturnTo) {
            let returnToEdit = req.session.projectEditReturnTo;
            delete req.session.projectEditReturnTo;
            return res.redirect(returnToEdit);
        } else {
            return res.redirect('/projects');
        }

    }

});

// TODO: this really should use ID to load; we can hide that on the page per row if we load initial
// We can clearly get the ID like we do in other routes, so this really needs to be changed to ID loading
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
