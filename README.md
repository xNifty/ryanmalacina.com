# ryanmalacina.com

###### https://ryanmalacina.com

This repository contains the code for my personal website, which is built on NodeJS, Express-Handlebars and Bootstrap.  
The development branch may be broken at any given time - I actively push in progress stuff to work on between machines which may or may not be tested and working. If it's not merged into master, assume it has a high chance of being broken.

---

At this time, the front end is fairly generic, and this is because I am admittedly not a big front-end development person. I prefer to tinker in the code that powers everything, not the code that makes it look nice. I am more than happy to accept pull requests that change the front end or even rewrite portions of the back-end code that could be done better.

If you wish to use this for your own personal site, there are a few things to note:

## Webpack

This project now makes use of Webpack for building the CSS and JS files. This removes the requirement for me to increment constant values when I make changes and instead simple requires me to run webpack to generate the new CSS and JS files so that any new versions are grabbed and cached versions are not loaded. The handlebars template files are set up to use the generated files. Webpack is not used for anything else.

```
npx webpack
```

## .env File

1. You must rename .example.env to .env and fill this out
2. The required keys are:

   a. privateKey  
   b. mongoURL  
   c. secretKey (this is the recaptcha secret key)  
   d. PORT

3. The other keys are optional and not required unless you wish to make use of that functionality
4. siteKey and secretKey are from Recaptcha, and therefore you will need to generate them there  
   a. They are required at this time as there is no setting for enabling or disabling Recaptcha support

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
