const mongoose = require('mongoose');
const Joi = require('joi');

const newsScheme = new mongoose.Schema({
    news_title: {
        type: String,
        unique: true,
        required: true,
        maxlength: 125
    },
    news_description_markdown: {
        type: String,
        required: true,
        minlength: 10,
        maxlength: 25000
    },
    news_description_html: {
        type: String,
        minlength: 10,
        maxlength: 25000
    },
    last_edited: {
        type: String
    },
    is_published: {
        type: Boolean,
        default: false
    }
});

const News = mongoose.model('News', newsScheme);

exports.News = News;

