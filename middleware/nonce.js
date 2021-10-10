/*
    nonce.js

    This is a piece of middleware that we can use to generate a nonce on a page load
    The nonce is regenerated on every page load so that we don't reuse nonces across different pages
*/
import { v4 } from 'uuid';
import csp from 'helmet-csp';
import express from 'express';

// const uuid = require('uuid');
// const csp = require('helmet-csp');
// const express = require('express')

const router = express.Router();

/*
    Generate nonce
*/
export function generateNonce() {
    const rhyphen = /-/g;
    return v4().replace(rhyphen, ``);
}

/*
    Setup the directives for use in CSP and then return it
*/
export function getDirectives(nonce) {
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
    ];
    const reportTo = 'https://ryanmalacina.report-uri.com/r/d/csp/enforce';
    return {
        defaultSrc: [self],
        scriptSrc: [self, nonce, ...scripts],
        styleSrc: [self, nonce, ...styles],
        fontSrc: [self, ...fonts],
        connectSrc: [self, ...connect],
        frameSrc: [self, ...frame],
        objectSrc: [none],
        baseUri: [none],
        formAction: [self],
        frameAncestors: [none],
        reportUri: reportTo
    };
}

/*
    Function to generate the nonce and then setup the directives
*/
export function genCSP(req, res, next) {
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

export default {
    generateNonce,
    getDirectives,
    genCSP
};
//module.exports.isLoggedIn = loggedInOnly;