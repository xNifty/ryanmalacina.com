import Mailgun from "mailgun.js";
import formData from "form-data";

const mailgun = new Mailgun(formData);
const mg = mailgun.client({ username: "api", key: process.env.mailgunAPI });

const domain = process.env.mailgunDomain;

export default {
  mg,
  domain,
};
