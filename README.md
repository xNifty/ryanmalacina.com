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

1. Rename default.json.example to default.json (for development environment) or production.json (for production environment)
2. Required keys that you should change are:

   a. cookieName  
   b. port  
   c. blogURL (if making use of Ghost Blog to integrate posts into homepage)  
   d. blogVersion (if making use of Ghost Blog to integrate posts into homepage (at this time it should be set to v5.0 if using latest Ghost))  
   e. showBlog (set to true if you are integrating with Ghost for displaying posts)  
   f. recaptchaSiteKey (publicly available key that is used to generate the recaptcha)  
   g. trustProxy (set to true if behind a reverse proxy)  

3. Required keys that you must change:  
   a. rootURL

## Installing

There should be nothing else special that you need to do other than installing all dependencies via

```
npm install
```
