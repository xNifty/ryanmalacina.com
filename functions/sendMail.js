import Mailgun from 'mailgun.js';
import formData from 'form-data';

const mailgun = new Mailgun(formData);
const mg = mailgun.client({username: 'api', key: process.env.mailgunAPI})

const domain = process.env.mailgunDomain;

// This is your API key that you retrieve from www.mailgun.com/cp (free up to 10K monthly emails)
const auth = {
    auth: {
        api_key: process.env.mailgunAPI,
        domain: process.env.mailgunDomain
    },
    proxy: false // optional proxy, default is false
};

export function sendMail(fromEmail, toEmail, subject, text, req, res) {
    try {
        mg.messages.create(domain, {
            from: fromEmail,
            to: toEmail,
            subject: subject,
            text: text
        })
        .then(msg => {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({success: "Updated Successfully", status: 200}));
        })
        .catch(err => {
                console.log(`Error: ${err.message}`);
                res.setHeader('Content-Type', 'application/json');
                req.recaptcha.re
                return res.end(JSON.stringify({fail: "Error", status: 400}));
        });
    } catch (ex) {
        console.log(ex);
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({fail: "Server error", status: 500}));
    }
};

export function sendMailNoRedirect(fromEmail, toEmail, subject, text, ishtml) {
    try {
        if (ishtml) {
            mg.messages.create(domain, {
                from: fromEmail,
                to: toEmail,
                subject: subject,
                text: subject,
                html: text
            })
            .then(msg => {
                return true;
            })
            .catch(err => {
                    console.log(`Error: ${err.message}`);
                    return false;
            });
        } else {
            mg.messages.create(domain, {
                from: fromEmail,
                to: toEmail,
                subject: subject,
                text: text
            })
            .then(msg => {
                return true;
            })
            .catch(err => {
                    console.log(`Error: ${err.message}`);
                    return false;
            });
        }
        
    } catch (ex) {
        console.log(ex);
        return false;
    }
};

export default {
    sendMail,
    sendMailNoRedirect
}