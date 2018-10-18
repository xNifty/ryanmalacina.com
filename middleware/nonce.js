// Use this to generate a nonce on any page that needs it; we don't want static nonce usage
const uuid = require('uuid');
const csp = require('helmet-csp');
const express = require('express');
const router = express.Router();

function generateNonce() {
    const rhyphen = /-/g;
    return uuid.v4().replace(rhyphen, ``);
}

/* constants for CSP */
function getDirectives(nonce) {
    const self = `'self'`;
    const unsafeInline = `'unsafe-inline'`;
    const scripts = [
        `https://cdnjs.cloudflare.com`, `https://code.jquery.com`,
        `https://maxcdn.bootstrapcdn.com`
    ];
    const styles = [
        `https://cdnjs.cloudflare.com`, `https://fonts.googleapis.com`,
        `https://maxcdn.bootstrapcdn.com`
    ];
    const fonts = [
        `https://cdnjs.cloudflare.com`, `https://fonts.gstatic.com`,
        `https://maxcdn.bootstrapcdn.com`
    ];
    const connect = [
        `https://cdn.jsdelivr.net`
    ];
    return {
        defaultSrc: [self],
        scriptSrc: [self, nonce, ...scripts],
        styleSrc: [self, nonce, ...styles],
        fontSrc: [self, ...fonts],
        connectSrc: [self, ...connect]
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

module.exports.genCSP = genCSP;