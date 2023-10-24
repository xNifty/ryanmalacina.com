# ryanmalacina.com

###### https://ryanmalacina.com

This repository contains the code for my personal website, which is built on NodeJS, Express-Handlebars and Bootstrap.

---

At this time, the front end is fairly generic, and this is because I am admittedly not a big front-end development person. I prefer to tinker in the code that powers everything, not the code that makes it look nice. I am more than happy to accept pull requests that change the front end or even rewrite portions of the back-end code that could be done better.

If you wish to use this for your own personal site, there are a few things to note:

## .env File

1. You must rename .example.env to .env and fill this out
2. The required keys are:

   a. privateKey  
   b. mongoURL  
   c. siteKey  
   d. secretKey

3. The other keys are optional and not required unless you wish to make use of that functionality
4. siteKey and secretKey are from Recaptcha, and therefore you will need to generate them there
   a. They are required at this time as there is no setting for enabling or disabling Recaptcha support

## Config File

1. Rename default.json.example to default.json (for development environment) or production.json (for production environment)
1. Required keys that you should change are:

   a. cookieName  
   b. port  
   c. blogURL (if making use of Ghost Blog to integrate posts into homepage)  
   d. blogVersion (if making use of Ghost Blog to integrate posts into homepage (at this time it should be set to v5.0 if using latest Ghost))

1. Required keys that you must change:
   a. rootURL

## Installing

There should be nothing else special that you need to do other than installing all dependencies via  
 `    npm install
   `
