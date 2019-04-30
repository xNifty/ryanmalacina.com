const express = require('express');
const router = express.Router();
const {Project, validate} = require('../models/projects');
const mongoose = require('mongoose');
const config = require('config');

const nodemailer = require('nodemailer');
const mg = require('nodemailer-mailgun-transport');

// This is your API key that you retrieve from www.mailgun.com/cp (free up to 10K monthly emails)
const auth = {
    auth: {
        api_key: config.get("mailgunAPI"),
        domain: config.get("mailgunDomain")
    },
    proxy: false // optional proxy, default is false
};

const nodemailerMailgun = nodemailer.createTransport(mg(auth));

router.get("/", async (req, res) => {
    let project_list = await listProjects();

    if (req.user) {
        return res.render("index", {
            title: "Ryan Malacina | Home",
            name: req.user.realName,
            projects: project_list
        });
    } else {
        return res.render("index", {
            title: "Ryan Malacina | Home",
            projects: project_list
        });
    }
});

router.post('/send', async(req, res) => {
   let fromEmail = req.body.email;
   let toEmail = config.get('mailgunToEmail');
   let subject = req.body.subject;
   let message = req.body.message;

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

               // Boy, this is hacky
               if (err.message === "'from' parameter is not a valid address. please check documentation") {
                   res.setHeader('Content-Type', 'application/json');
                   return res.end(JSON.stringify({fail: "Error", status: 406}));
               } else {
                   res.setHeader('Content-Type', 'application/json');
                   return res.end(JSON.stringify({fail: "Error", status: 400}));
               }
           }
           else {
               res.setHeader('Content-Type', 'application/json');
               return res.end(JSON.stringify({success : "Updated Successfully", status : 200}));
           }
       });
   } catch (ex) {
       console.log(ex);
       res.setHeader('Content-Type', 'application/json');
       return res.end(JSON.stringify({fail : "Server error", status : 500}));
   }
});

async function listProjects() {
    return Project.find({is_published: 1}).select({
        project_name: 1,
        project_image: 1,
        project_title: 1,
        _id: 0
    }).limit(4);
}

module.exports = router;
