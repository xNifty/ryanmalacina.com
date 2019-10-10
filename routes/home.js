const express = require('express');
const router = express.Router();
const {Project, validateProject} = require('../models/projects');
const {News, validateNews} = require('../models/news');
const mongoose = require('mongoose');
const config = require('config');
const Recaptcha = require('express-recaptcha').RecaptchaV2;

const nodemailer = require('nodemailer');
const mg = require('nodemailer-mailgun-transport');

const recaptcha = new Recaptcha(
    config.get('siteKey'),
    config.get('secretKey')
);

// This is your API key that you retrieve from www.mailgun.com/cp (free up to 10K monthly emails)
const auth = {
    auth: {
        api_key: config.get("mailgunAPI"),
        domain: config.get("mailgunDomain")
    },
    proxy: false // optional proxy, default is false
};

const nodemailerMailgun = nodemailer.createTransport(mg(auth));

router.get("/", recaptcha.middleware.render, async (req, res) => {
    let project_list = await listProjects();
    let news_list = await listNews();

    for (var x in news_list) {
        let counter_number = x;
        counter_number++;
        news_list[x].counter = counter_number;
        console.log(news_list[x]);
    };

    //console.log(news_list);

    // This is really, really dumb - awesome!
    let recaptcha = res.recaptcha;
    let recaptchaNonce = res.locals.nonce;
    recaptcha = recaptcha.replace('defer></script>', `" defer nonce="${recaptchaNonce}"></script>`); //<script>grecaptcha
    recaptcha = recaptcha.replace('<script>grecaptcha', `<script nonce="${recaptchaNonce}">grecaptcha`);

    return res.render("index", {
        title: "Ryan Malacina | Home",
        projects: project_list,
        index: true,
        captcha: recaptcha,
        siteKey: config.get('siteKey'),
        news: news_list
    });
});

router.post('/send', recaptcha.middleware.verify, async(req, res) => {
   let fromEmail = req.body.email;
   let toEmail = config.get('mailgunToEmail');
   let subject = req.body.subject;
   let message = req.body.message;

   // console.log(req.params);
   // console.log(req.recaptcha.error);

   if (!req.recaptcha.error) {
       try {
            nodemailerMailgun.sendMail({
                from: fromEmail,
                to: toEmail, // An array if you have multiple recipients.
                subject: subject,
                //html: message,
               text: message,
            }, (err, info) => {
                if (err) {
                    console.log(`Error: ${err.message}`);

                    /*
                        So we're going to replace some error messages that are returned from mailgun,
                        so that we can display some more user friendly errors that are actually helpful
                        for the user if they see it.
                    */
                    if (err.message === "'from' parameter is not a valid address. please check documentation") {
                        res.setHeader('Content-Type', 'application/json');
                        return res.end(JSON.stringify({fail: "Error", status: 406}));
                    } else {
                        res.setHeader('Content-Type', 'application/json');
                        return res.end(JSON.stringify({fail: "Error", status: 400}));
                    }
                } else {
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({success: "Updated Successfully", status: 200}));
                }
            });
        } catch (ex) {
            console.log(ex);
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({fail: "Server error", status: 500}));
        }
   } else {
       res.setHeader('Content-Type', 'application/json');
       return res.end(JSON.stringify({fail: "Server error", status: 500}));
   }
});

async function listProjects() {
    return Project.find({is_published: 1}).select({
        project_name: 1,
        project_image: 1,
        project_title: 1,
        _id: 0
    });
}

async function listNews() {
    return News.find({is_published: 1}).select({
        news_title: 1,
        published_date: 1,
        news_description: 1,
        _id: 0
    }).limit(5).sort({_id: -1}).lean();
}

module.exports = router;
