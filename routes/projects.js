// projects.js
// Handles all of the different project routes

import { Project, validateProject } from '../models/projects.js';
import {clearProjectEditSessionVariables} from '../functions/sessionHandler.js';
import express from 'express';
import auth from '../middleware/auth.js';
import MarkdownIt from 'markdown-it';
import sanitize from 'sanitize-html';
import dateFormat from 'dateformat';
import fileUpload from 'express-fileupload';
import { constants } from '../models/constants.js'
import config from 'config';
import _ from 'lodash';

const router = express.Router();
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

// @TODO: Fix return updating when errors on page
router.get('/new', [auth.isLoggedIn, auth.isAdmin], async(req, res) => {
    var returnTo;

    if (req.session.returnToSession) {
        if (req.session.returnToSession === req.get('referrer') && req.get('referrer') !== config.get("rootURL") + "/projects")
            returnTo = req.session.returnToSession;
        else {
            returnTo = req.get('referrer');
            req.session.returnToSession = req.get('referrer');
        }
    } else {
        returnTo = req.get('referrer');
        req.session.returnToSession = req.get('referrer');
    }

    res.render('admin/projects/new-project', {
        layout: 'projects',
        new_project: true,
        return_to: returnTo
    });
});

router.post('/new', [auth.isLoggedInJson, auth.isAdmin], async(req, res) => {
    const { error } = validateProject(req.body);
    var returnTo;

    if (req.session.returnToSession) {
        returnTo = req.session.returnToSession;
    } else {
        returnTo = '/projects/';
    }

    if (error) {
        return res.status(400).render('admin/projects/new-project', {
            layout: 'projects',
            new_project: true,
            error: constants.errors.allFieldsRequiredUploadImage,
            project_name: req.body.project_name,
            project_title: req.body.project_title,
            project_source: req.body.project_source,
            project_description: req.body.project_description,
            return_to: returnTo
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
    let adjustedFileName = '';

    if (req.files.project_image) {
        projectImage = req.files.project_image;
        adjustedFileName = projectImage.name.split('.').join('-' + Date.now() + '.');
        project.project_image = adjustedFileName;
    } else {
        if (!project.project_image) {
            project.project_image = 'default.png';
        }
    }

    project.project_description_markdown = req.body.project_description;
    project.project_description_html = projectSanitized;
    let saveDate = new Date(Date.now());

    try {
        // Try moving the image; if that fails, redirect back with error message
	    if (projectImage) {
            await projectImage.mv('./public/images/' + adjustedFileName);
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
            project_image: req.files.project_image ? req.files.project_image : '',
	        last_edited: saveDate
        });
    }
    if (req.session.returnToSession) delete req.session.returnToSession;
    req.flash('success', constants.success.projectAdded);
    res.redirect('/projects');
});

router.get('/:id/edit', [auth.isLoggedIn, auth.isAdmin], async(req, res) => {
    const project = await Project.findOne({
        _id: req.params.id
    });

    delete req.session.project_id;
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
        res.render('admin/projects/new-project', {
            layout: 'projects',
            update_project: true,
            project_name: req.session.project_name,
            project_title: req.session.project_title,
            project_source: req.session.project_source,
            project_description: req.session.project_description_markdown,
            project_image: req.session.project_image,
            id: req.session.project_id,
        });

        // Finally, clear up the session variables -- can I move this to a function where we delete them if they exist?
        clearProjectEditSessionVariables(req);
    }
});

router.post('/edit', [auth.isLoggedInJson, auth.isAdmin], async(req, res) => {
    let project = await Project.find({_id: req.session.project_id}).select(
        { project_image: 1, _id: 0, is_published: 1 });

        req.session.project_image = project[0].project_image;

    try {
        const { error } = validateProject(req.body);
        var errorMessage = '';
        // Return error messages because this is getting old
        if (error) {
            for (let i = 0; i < error.details.length; i++) {
                if (error.details[i].context.key === 'project_description') {
                    errorMessage += constants.errors.projectDescriptionLength + '<br>';
                }
                if (error.details[i].context.key === 'project_name') {
                    errorMessage += constants.errors.projectName + '<br>';
                }
                if (error.details[i].context.key === 'project_title') {
                    errorMessage += constants.errors.projectTitle + '<br>';
                }
                if (error.details[i].context.key === 'project_source') {
                    errorMessage += constants.errors.projectSource + '<br>';
                }
                    //throw new Error(constants.errors.projectDescriptionLength);
            }
            throw new Error(errorMessage);
        }

        let projectDescription = md.render(req.body.project_description);
        //let projectDescription = converter.makeHtml(req.body.project_description);

        // We want to allow the h1 tag in our sanitizing
        let projectSanitized = sanitize(projectDescription, { allowedTags: safeTags });
        let saveDate = new Date(Date.now());

        /*
        Default the project image to blank and if it exists, we can then set the image to the image from the
        body of the page.  If there is no image found, we will use the default image that we set.
        */
        let projectImage = '';
        let adjustedFileName = '';

        if (req.files) {
            projectImage = req.files.project_image;
            adjustedFileName = projectImage.name.split('.').join('-' + Date.now() + '.');

            req.session.project_image = projectImage;

            await projectImage.mv('./public/images/' + adjustedFileName);
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

        if (req.session.projectEditSuccess && project[0].is_published) {
            let returnTo = req.session.projectEditSuccess;
            clearProjectEditSessionVariables(req);
            req.flash('success', constants.success.projectUpdated);
            return res.redirect(returnTo);
        } else if (req.session.projectEditSuccess && !project[0].is_published) {
            let returnTo = req.session.projectEditReturnTo;
            clearProjectEditSessionVariables(req);
            req.flash('success', constants.success.projectUpdated);
            return res.redirect(returnTo);
        } else {
            clearProjectEditSessionVariables(req);
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

        res.render('admin/projects/new-project', {
            layout: 'projects',
            update_project: true,
            project_name: req.session.project_name,
            project_title: req.session.project_title,
            project_source: req.session.project_source,
            project_description: req.session.project_description_markdown,
            project_image: req.session.project_image,
            id: req.session.project_Id,
            error: errorMessage
        });

        clearProjectEditSessionVariables(req);
        return;

        // if (req.session.projectReturnTo) {
        //     let returnToEdit = req.session.projectEditReturnTo;
        //     delete req.session.projectEditReturnTo;
        //     req.flash('error', ex.message);
        //     return res.redirect(returnToEdit);
        // } else {
        //     req.flash('error', ex.message);
        //     return res.redirect('/projects');
        // }
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
    res.setHeader('content-type', 'text/plain');
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
