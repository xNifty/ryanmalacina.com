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

// Publish the news entry
router.post('/news/new', [auth.isLoggedIn, auth.isAdmin], async(req, res) => {
    const { error } = validateNews(req.body);

    let news = new News(_.pick(req.body, [
        'news_title', 'news_description'
    ]));

    if (error) {
        return res.status(400).render('admin-news', {
            error: constants.errors.allFieldsRequired,
            news_title: req.body.news_title,
            news_description: req.body.news_description
        });
    }

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
            last_edited: saveDate
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

async function listProjects() {
    return Project.find().select({
        project_name: 1,
        project_image: 1,
        project_title: 1,
        is_published: 1,
        _id: 1
    });
}

async function getNewsListing() {
    return News.find().select({
        news_title: 1,
        is_published: 1,
        _id: 1
    });
}

module.exports = router;