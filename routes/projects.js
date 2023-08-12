// projects.js
// Handles all of the different project routes

import { Project, validateProject } from '../models/projects.js';
import mongoose from 'mongoose';
import express from 'express';
import auth from '../middleware/auth.js';
import _ from 'lodash';
import session from 'express-session';
import MarkdownIt from 'markdown-it';
import sanitize from 'sanitize-html';
import dateFormat from 'dateformat';
import fileUpload from 'express-fileupload';
import { constants } from '../models/constants.js'
import config from 'config';

const router = express.Router();
const isSet = _;
const md = new MarkdownIt();
const dateformat = dateFormat;

const safeTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
                  'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br',
                  'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre'
];

//let converter = new showdown.Converter();

router.use(fileUpload());

router.get("/", async (req, res) => {
    let project_list = await listProjects();

    res.render("projects", {
        title: "Ryan Malacina | Projects",
        projects: project_list,
    });
});

router.get('/new', [auth.isLoggedIn, auth.isAdmin], async(req, res) => {
    let returnTo = req.get('referrer');
    if (!returnTo) returnTo = '/projects/';

    res.render('admin/projects/new-project', {
        layout: 'projects',
        new_project: true,
        return_to: returnTo
    });
});

router.post('/new', [auth.isLoggedInJson, auth.isAdmin], async(req, res) => {
    const { error } = validateProject(req.body);

    if (error) {
        return res.status(400).render('admin/projects/new-project', {
            layout: 'projects',
            new_project: true,
            error: constants.errors.allFieldsRequiredUploadImage,
            project_name: req.body.project_name,
            project_title: req.body.project_title,
            project_source: req.body.project_source,
            project_description: req.body.project_description
        });
    }

    let project = new Project(_.pick(req.body, [
        'project_name', 'project_title', 'project_source'
    ]));

    let projectDescription = md.render(req.body.project_description);
    let projectSanitized = sanitize(projectDescription, { allowedTags: safeTags });

    /*
        Default the project image to blank and if it exists, we can then set the image to the image from the
        body of the page.  If there is no image found, we will use the default image that we set.
    */
    let projectImage = '';

    if (req.body.project_image)
        projectImage = req.files.project_image;

    // If there is no image, use a default image
    if (!projectImage)
        project.project_image = "default.png";
    else
        project.project_image = projectImage.name; // File name, nothing else

    project.project_description_markdown = req.body.project_description;
    project.project_description_html = projectSanitized;
    let saveDate = new Date(Date.now());

    try {
        // Try moving the image; if that fails, redirect back with error message
	    if (projectImage) {
            await projectImage.mv('./public/images/' + projectImage.name);
        }
        await project.save();
    } catch(ex) {
        return res.status(400).render('admin/projects/new-project', {
            layout: 'projects',
            new_project: true,
            error: constants.errors.allFieldsRequired,
            project_name: req.body.project_name,
            project_title: req.body.project_title,
            project_source: req.body.project_source,
            project_description: req.body.project_description,
            project_image: req.body.project_image ? req.body.project_image : '',
	        last_edited: saveDate
        });
    }
    req.flash('success', constants.success.projectAdded);
    res.redirect('/projects');
});

router.get('/:id/edit', [auth.isLoggedIn, auth.isAdmin], async(req, res) => {
    const project = await Project.findOne({
        _id: req.params.id
    });

    req.session.project_id = project._id;

    // For if the edit fails, otherwise we want to return to the normal project information page
    // Instead of this, hard set the URL from configfile (set a base url) and from there we can load the 
    // proper project since we know the ID
    req.session.projectEditReturnTo = config.get("rootURL") + "/projects/" + project._id + "/edit";
    req.session.projectEditSuccess = config.get("rootURL") + "/projects/" + project._id;

    // If not load from session, then load normally; else, load from session
    if (!req.session.loadProjectFromSession) {
        res.render('admin/projects/new-project', {
            layout: 'projects',
            update_project: true,
            project_name: project.project_name,
            project_title: project.project_title,
            project_source: project.project_source,
            project_description: project.project_description_markdown,
            project_image: project.project_image,
            id: project._id
        });
    } else {
        res.render('projects', {
            layout: 'projects',
            update_project: true,
            project_name: req.session.project_name,
            project_title: req.session.project_title,
            project_source: req.session.project_source,
            project_description: req.session.project_description_markdown,
            project_image: req.session.project_image,
            id: project._id
        });

        // Finally, clear up the session variables -- can I move this to a function where we delete them if they exist?
        delete req.session.loadProjectFromSession;
        delete req.session.project_name;
        delete req.session.project_title;
        delete req.session.project_source;
        delete req.session.project_description_markdown;
        delete req.session.project_image;
    }
});

router.post('/edit', [auth.isLoggedInJson, auth.isAdmin], async(req, res) => {
    let currentImage = await Project.find({_id: req.session.project_id}).select(
        { project_image: 1, _id: 0, is_published: 1 });

    try {
        const { error } = validateProject(req.body);
        // I should clean up this error messaging code to provide detailed feedback for all required fields
        // that are either missing or not long enough
        if (error) {
            for (let i = 0; i < error.details.length; i++) {
                //console.log(error.details[i].context.key);
                if (error.details[i].context.key === 'project_description')
                    throw new Error(constants.errors.projectDescriptionLength);
            }
        }

        let projectDescription = md.render(req.body.project_description);
        //let projectDescription = converter.makeHtml(req.body.project_description);

        // We want to allow the h1 tag in our sanitizing
        let projectSanitized = sanitize(projectDescription, { allowedTags: safeTags });
        let saveDate = new Date(Date.now());
        let projectImage = '';

        // @TODO : CLEAN ALL OF THIS UP; THIS IS UGLY
        try {
            projectImage = req.files.project_image;
        } catch (ex) {
            projectImage = '';
        }

        // If no image is selected, set it to the existing image; otherwise, error because we need an image
        if (!projectImage) {
            if (currentImage[0].project_image) {
                projectImage = currentImage[0].project_image;
                await Project.findByIdAndUpdate({_id: req.session.project_id}, {
                    project_name: req.body.project_name,
                    project_title: req.body.project_title,
                    project_source: req.body.project_source,
                    project_description_markdown: req.body.project_description,
                    project_description_html: projectSanitized,
                    project_image: projectImage,
                    last_edited: saveDate
                });
            }
            else {
                throw new Error(constants.errors.imageRequired);
            }
        } else {
            // Only move if the image has a different name; unique names only, not that hard
            // @TODO : really should limit file sizes to the ideal image size of 263x263
            if (projectImage.name === currentImage[0].project_image) { // Boy, this is just dumb
                throw new Error(constants.errors.uniqueImageName);
            } else {
                // Not the same, so move it!
                // This condition is only ever going to be met if it's a new image, but maybe should add some security
                // to this later on, just in case
                await projectImage.mv('./public/images/' + projectImage.name);
                await Project.findByIdAndUpdate({_id: req.session.project_id}, {
                    project_name: req.body.project_name,
                    project_title: req.body.project_title,
                    project_source: req.body.project_source,
                    project_description_markdown: req.body.project_description,
                    project_description_html: projectSanitized,
                    project_image: projectImage.name,
                    last_edited: saveDate
                });
            }
        }
        if (req.session.projectEditSuccess && currentImage[0].is_published) {
            let returnTo = req.session.projectEditSuccess;
            delete req.session.projectReturnTo;
            delete req.session.projectEditReturnTo; // Still need to delete even though we didn't use it
            delete req.session.project_id;
            delete req.session.projectEditSuccess;
            req.flash('success', constants.success.projectUpdated);
            return res.redirect(returnTo);
        } else if (req.session.projectEditSuccess && !currentImage[0].is_published) {
            let returnTo = req.session.projectEditReturnTo;
            delete req.session.projectReturnTo;
            delete req.session.projectEditReturnTo; // Still need to delete even though we didn't use it
            delete req.session.project_id;
            delete req.session.projectEditSuccess;
            req.flash('success', constants.success.projectUpdated);
            return res.redirect(returnTo);
        } else {
            delete req.session.project_id;
            req.flash('success', constants.success.projectUpdated);
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

        if (req.session.projectReturnTo) {
            let returnToEdit = req.session.projectEditReturnTo;
            delete req.session.projectEditReturnTo;
            req.flash('error', ex.message);
            return res.redirect(returnToEdit);
        } else {
            req.flash('error', ex.message);
            return res.redirect('/projects');
        }
    }

});

// Delete project
router.put("/delete/:id", [auth.isAdmin, auth.isLoggedIn], async(req, res) => {
    let id = req.params.id;
    if (await deleteProject(id)) {
        req.flash('success', constants.success.deleteSuccess);
        return res.end('{"success" : "Project Deleted", "status" : 200}');
    } else {
        req.flash('error', constants.errors.publishError);
        return res.end('{"fail" : "Server error", "status" : 500}');
    }
});

router.get("/:id", async(req, res) => {
    const project = await Project.findOne({
        _id: req.params.id,
    });

    req.session.projectReturnTo = config.get("rootURL") + "/projects/" + project._id;

    // Intentionally leaving this different, as our "custom" error page doesn't display the text via alerts
    if (!project || !project.is_published) {
        return res.render("error", {
            error: constants.errors.invalidProject,
            title: constants.pageHeader.notFound,
            status_code: constants.statusCodes[404]
        });
    }

    res.render("projects", {
        project_title: project.project_title,
        project_source: project.project_source,
        project_description: project.project_description_html,
        project_name: project.project_name,
        is_valid: true,
        last_save_date: dateformat(project.last_edited, "mmmm dd, yyyy @ h:MM TT"),
        title: 'Ryan Malacina | ' + project.project_name,
        id: project._id
    });
});

router.put("/update/:id", [auth.isAdmin, auth.isLoggedIn], async(req, res) => {
    let id = req.params.id;
    const project = await Project.findOne({
        _id: id,
    });

    let status = project.show_index;

    try {
        if (status) {
            await Project.findByIdAndUpdate({_id: id}, {
                show_index: false
            });
        } else {
            await Project.findByIdAndUpdate({_id: id}, {
                show_index: true
            });
        }
        return res.end('{"success" : "Index rating updated", "status" : 200}');
    } catch(err) {
        return res.end('{"fail" : "Server error", "status" : 500}');
    }  
});

async function listProjects() {
    return Project.find({is_published: 1}).select({
        project_name: 1,
        project_image: 1,
        project_title: 1,
        _id: 1
    }).lean();
}

async function deleteProject(id) {
    try {
        await Project.deleteOne({_id: id});
        return true;
    } catch(err) {
        console.log(err);
        return false;
    }
}

export {router as projectsRoute };
