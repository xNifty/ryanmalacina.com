# ryanmalacina.com

###### https://ryanmalacina.com

These are the files for my personal website. The site is built on NodeJS, Express and MongoDB and makes use of
Bootstrap for the styling of the site.

Any branch but master may be broken at any given time and is not guaranteed to work.

---

The site is built to be a personal site and as such is not designed to be easily used by others; however, I have made it open source for those who wish to use it as a base for their own site and there are a few things that you will need to do to get it up and running and a few things to note.

## Webpack

This project now makes use of Webpack for building the CSS and JS files. This removes the requirement for me to increment constant values when I make changes and instead simple requires me to run webpack to generate the new CSS and JS files so that any new versions are grabbed and cached versions are not loaded. The handlebars template files are set up to use the generated files. Webpack is not used for anything else. See: ```webpack.config.js``` if you wish to add your own CSS or JS files and how to set up the configuration.

```
npx webpack
```

## .env File
There are several pieces in this file that MUST be changed in order for the site to work properly. The .env file is not included in the repository and must be created by the user. The .env file is used to store sensitive information that should not be shared with others. An example is provided in the .example.env file, which you can rename to .env and modify.

The following are the list of keys within this file, and what they are used for and if you must change them to get the site to work properly.

1. privateKey - This is used to sign the JWT tokens that are used for authentication. This key should be a random string of characters and should be kept secret.
2. mailgunAPIKey - This is used to send emails from the site. This key should be kept secret and is provied by Mailgun.
3. mailgunDomain - This is used to send emails from the site. This is simply the mailing address domain that you have set up with Mailgun.
4. secretKey - 
5. blogAPI - This is the URL to the Ghost blog API. This is used to pull in blog posts from the Ghost blog. Createdv ia custom intrgration in Ghost integration settings.
7. GitHubAuth - this isn't used for anything at this time
8. mongoURL - This is the URL to the MongoDB database that the site uses. This should be kept secret.
9. PORT - This is the port that the site will run on. This should be changed if you are running multiple sites on the same server.
10. BCRYPT_SALT - This is the number of rounds that bcrypt will use to hash passwords. This should be a number between 10 and 12.
11. mailgunFromEmail - This is simply the email that will show when sending emails (e.g. noreply@yourwebsite.com)
12. csrfSecret - This is used to generate the CSRF token. This should be a random string of characters and should be kept secret.
13. elasticUsername - This is the username for the ElasticSearch instance. This should be kept secret.
14. elasticPassword - This is the password for the ElasticSearch instance. This should be kept secret.
15. elasticURL - This is the URL to the ElasticSearch instance. This should be kept secret.
16. useElasic - This is a boolean value that determines if the site will use ElasticSearch or default MongoDB for searching. This should be set to false if you do not have an ElasticSearch instance.

## Config File
his file is used to store configuration information that is not sensitive and can be shared with others. This file is used to store information that is used to configure the site. This file is not included in the repository and must be created by the user. An example is provided in the default.json.example file, which you can rename to default.json or production.json and modify.

** YOU MUST SET rootURL TO THE URL OF YOUR SITE **

1. cookieName - This is the name of the cookie for the site.
2. useProxy - This is a boolean value that determines if the site is behind a proxy. This should be set to true if the site is behind a proxy.
3. resave - This is a boolean value that determines if the session should be saved on every request.
4. saveUninitialized - This is a boolean value that determines if the session should be saved even if it is not modified.
5. secureCookie - This is a boolean value that determines if the cookie should only be sent over HTTPS. Set true if the site is using HTTPS.
6. sameSite - This is a string value that determines the SameSite attribute of the cookie. This should be set to 'Lax' if the site is using HTTPS.
7. maxAge - This is the maximum age of the cookie in milliseconds.
8. blogURL - This is the URL to the Ghost blog. This is used to link to the blog from the site.
9. docsURL - I use this to link to my documentation URL; however, you can use this for any URL that you want to link to, technically.
10. showBlog - Boolen value that determines if the blog should be shown on the site.
11. blogVersion - Ghost version, in Major.Minor format (e.g. v5.0)
12. rootURL - This is the root URL of the site. This is used to generate URLs for the site.
13. recapchaSiteKey - This is the site key for Google's reCAPTCHA. This is used to prevent bots from submitting forms. This is a public key, and is different from the key in .env
14. trustProxy - This is a boolean value that determines if the site should trust the proxy. This should be set to true if the site is behind a proxy.
15. showDocs - Boolean value that determines if the documentation link should be shown on the site.

## Installing

There should be nothing else special that you need to do other than installing all dependencies via

```
npm install
```
