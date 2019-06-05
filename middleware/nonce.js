/*
    nonce.js
    This is a piece of middleware that we can use to generate a nonce on a page load
    The nonce is regenerated on every load
*/
const uuid = require('uuid');
const csp = require('helmet-csp');
const express = require('express')
const router = express.Router();

function generateNonce() {
    const rhyphen = /-/g;
    return uuid.v4().replace(rhyphen, ``);
}

/* constants for CSP */
function getDirectives(nonce) {
    const self = `'self'`;
    const unsafeInline = `'unsafe-inline'`; // Ideally, never going to use this anywhere for any reason
    const none = `'none'`;
    const scripts = [
        `https://cdnjs.cloudflare.com`, `https://code.jquery.com`,
        `https://maxcdn.bootstrapcdn.com`, `https://cdn.jsdelivr.net`,
        `https://www.google.com/recaptcha/`, `https://www.gstatic.com/recaptcha/`
    ];
    const styles = [
        `https://cdnjs.cloudflare.com`, `https://fonts.googleapis.com`,
        `https://maxcdn.bootstrapcdn.com`, `https://cdn.jsdelivr.net`
    ];
    const fonts = [
        `https://cdnjs.cloudflare.com`, `https://fonts.gstatic.com`,
        `https://maxcdn.bootstrapcdn.com`
    ];
    const connect = [
        `https://cdn.jsdelivr.net`
    ];
    const frame = [
        `https://www.google.com/recaptcha/`
    ]
    return {
        defaultSrc: [self],
        scriptSrc: [self, nonce, ...scripts],
        styleSrc: [self, nonce, ...styles],
        fontSrc: [self, ...fonts],
        connectSrc: [self, ...connect],
        frameSrc: [self, ...frame],
        objectSrc: [none],
	baseUri: [none]
    };
}

function genCSP(req, res, next) {
    try {
        let nonce = generateNonce();
        req.nonce = nonce;
        router.use(csp({
            directives: getDirectives(nonce)
        }));
        next();
    } catch(err) {
        console.log(err);
    }
}

module.exports.generateNonce = generateNonce;
module.exports.getDirectives = getDirectives;
module.exports.genCSP = genCSP;
