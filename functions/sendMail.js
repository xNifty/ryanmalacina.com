import Mailgun from "mailgun.js";
import formData from "form-data";

const mailgun = new Mailgun(formData);
const mg = mailgun.client({ username: "api", key: process.env.mailgunAPI });

const domain = process.env.mailgunDomain;

export async function sendMail(fromEmail, toEmail, subject, text, req, res) {
  try {
    const msg = await mg.messages.create(domain, {
      from: fromEmail,
      to: toEmail,
      subject: subject,
      text: text,
    });

    res.setHeader("Content-Type", "application/json");
    return res.end(
      JSON.stringify({ success: "Updated Successfully", status: 200 })
    );
  } catch (err) {
    console.log(`Error: ${err.message}`);
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ fail: "Error", status: 400 }));
  }
}

export async function sendMailNoRedirect(
  fromEmail,
  toEmail,
  subject,
  text,
  ishtml
) {
  try {
    const messageOptions = {
      from: fromEmail,
      to: toEmail,
      subject: subject,
    };

    if (ishtml) {
      messageOptions.html = text;
    } else {
      messageOptions.text = text;
    }

    const msg = await mg.messages.create(domain, messageOptions);
    return true;
  } catch (err) {
    console.log(`Error: ${err.message}`);
    return false;
  }
}

export default {
  sendMail,
  sendMailNoRedirect,
};
