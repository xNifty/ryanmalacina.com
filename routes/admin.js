const {Project, validateProject} = require('../models/projects');
const {News, validateNews} = require('../models/news');
const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const _ = require('lodash');
const session = require('express-session');
const showdown = require('showdown');
const sanitize = require('sanitize-html');
const dateformat = require('dateformat');

const constants = require('../models/constants');

let converter = new showdown.Converter();

router.get("/", [auth.isLoggedIn, auth.isAdmin], async(req, res) => {
    res.render("admin", {
        title: constants.pageHeader.admin
    });
});

router.get("/projects", [auth.isLoggedIn, auth.isAdmin], async(req, res) => {
    let project_list = await listProjects();

    res.render("admin/projects/projects", {
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

    res.render("admin/news/news", {
        layout: 'news',
        title: constants.pageHeader.adminProject,
        news: news_list
    });
});

// Publish the news entry
router.post('/news/new', [auth.isLoggedInJson, auth.isAdmin], async(req, res) => {
    const { error } = validateNews(req.body);

    let news_list = await getNewsListing();

    let news = new News(_.pick(req.body, [
        'news_title'
    ]));

    if (error) {
        console.log("Error 3: ", error);
        return res.status(400).render('admin-news', {
            error: constants.errors.allFieldsRequired,
            news_title: req.body.news_title,
            news_description: req.body.news_description,
            loadJS: true,
            news: news_list
        });
    }
    let newsDescription = converter.makeHtml(req.body.news_description);
    let newsSanitized = sanitize(newsDescription, { allowedTags: sanitize.defaults.allowedTags.concat(['h1']) });

    news.news_description_markdown = req.body.news_description;
    news.news_description_html = newsSanitized;
    let saveDate = new Date(Date.now());

    news.published_date = dateformat(saveDate, "mmmm dd, yyyy @ h:MM TT");

    try {
        await news.save();
    } catch(ex) {
        console.log('Error 2: ', ex);
        return res.status(400).render('admin-news', {
            error: constants.errors.allFieldsRequired,
            news_title: req.body.news_title,
            news_description: req.body.news_description,
            loadJS: true,
            news: news_list
        });
    }
    req.flash('success', constants.success.newsAdded);
    res.redirect('/admin/news');
});

router.put("/news/publish/:id", [auth.isAdmin, auth.isLoggedIn], async(req, res) => {
    let id = req.params.id;
    if (await publishNews(id)) {
        return res.end('{"success" : "Updated Successfully", "status" : 200}');
    } else {
        return res.end('{"success" : "Server error", "status" : 500}');
    }
});

router.put("/news/unpublish/:id", [auth.isAdmin, auth.isLoggedIn], async(req, res) => {
    let id = req.params.id;
    if (await unpublishNews(id)) {
        return res.end('{"success" : "Updated Successfully", "status" : 200}');
    } else {
        return res.end('{"fail" : "Server error", "status" : 500}');
    }
});

router.put("/news/delete/:id", [auth.isAdmin, auth.isLoggedIn], async(req, res) => {
    let id = req.params.id;
    if (await deleteNews(id)) {
        return res.end('{"success" : "News Entry Deleted", "status" : 200}');
    } else {
        return res.end('{"fail" : "Server error", "status" : 500}');
    }
});

// Edit News
router.get('/news/:id/edit', [auth.isLoggedIn, auth.isAdmin], async(req, res) => {
    let id = req.params.id;

    if (id == undefined) {
        id = req.session.news_id;
        req.session.news_id = null;
    }
        

    let news = null;

    try {
        news = await News.findOne({
            _id: id
        });
    } catch(err) {
        console.log("Edit err: ", err);
        let news_list = await getNewsListing();
        req.session.news_id = null;

        res.render("admin/news/admin-news", {
            title: constants.pageHeader.adminProject,
            news: news_list
        });
    }

    req.session.news_id = news._id;

    // Render edit news section - if no valid ID is found, send back to the news index and reset session var to be safe
    if (id != undefined) {
        res.render("admin/news/edit", {
            layout: 'news',
            title: news.news_title,
            news_title: news.news_title,
            news_description: news.news_description_markdown,
            loadJS: true
        });
    } else {
        let news_list = await getNewsListing();
        req.session.news_id = null;

        res.render("admin/news/news", {
            title: constants.pageHeader.adminProject,
            news: news_list,
            loadJS: true
        });
    }
});

// Publish the news entry
router.post('/news/edit', [auth.isLoggedInJson, auth.isAdmin], async(req, res) => {
    const { error } = validateNews(req.body);

    let news_list = await getNewsListing();

    let news = new News(_.pick(req.body, [
        'news_title'
    ]));

    if (error) {
        //console.log("Error 3: ", error);
        return res.status(400).render('admin/news/edit', {
            layout: 'news',
            error: constants.errors.allFieldsRequired,
            title: req.body.news_title,
            news_title: req.body.news_title,
            news_description: req.body.news_description
        });
    }
    let newsDescription = converter.makeHtml(req.body.news_description);
    let newsSanitized = sanitize(newsDescription, { allowedTags: sanitize.defaults.allowedTags.concat(['h1']) });

    news.news_description_markdown = req.body.news_description;
    news.news_description_html = newsSanitized;
    let saveDate = new Date(Date.now());

    news.published_date = dateformat(saveDate, "mmmm dd, yyyy @ h:MM TT");

    try {
        await News.findByIdAndUpdate({_id: req.session.news_id}, {
            news_title: req.body.news_title,
            news_description_markdown: req.body.news_description,
            news_description_html: newsSanitized
        });
    } catch(ex) {
        //console.log('Error 2: ', ex);
        return res.status(400).render('admin/news/edit', {
            layout: 'news',
            error: constants.errors.allFieldsRequired,
            title: req.body.news_title,
            news_title: req.body.news_title,
            news_description: req.body.news_description
        });
    }
    req.session.news_id = null;
    req.flash('success', constants.success.newsEdited);
    res.redirect('/admin/news');
});

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

async function publishNews(id) {
    try {
        await News.findByIdAndUpdate({_id: id}, {
            is_published: true
        });
        return true;
    } catch(err) {
        console.log(err);
        return false;
    }
}

async function unpublishNews(id) {
    try {
        await News.findByIdAndUpdate({_id: id}, {
            is_published: false
        });
        return true;
    } catch(err) {
        console.log(err);
        return false;
    }
}

async function deleteNews(id) {
    try {
        await News.deleteOne({_id: id});
        return true;
    } catch(err) {
        console.log(err);
        return false;
    }
}

async function listProjects() {
    return Project.find().select({
        project_name: 1,
        project_image: 1,
        project_title: 1,
        is_published: 1,
        show_index: 1,
        _id: 1
    }).lean();
}

async function getNewsListing() {
    return News.find().select({
        news_title: 1,
        is_published: 1,
        _id: 1
    }).lean();
}

module.exports = router;