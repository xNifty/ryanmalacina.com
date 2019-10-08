const mongoose = require('mongoose');
const Joi = require('@hapi/joi');

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
        maxlength: 280
    },
    news_description_html: {
        type: String,
        minlength: 10,
        maxlength: 280
    },
    published_date: {
        type: String
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

function validateNews(user) {
    const schema = {
        news_title: Joi.string().max(125).required(),
        news_description: Joi.string().min(20).max(10000).required(),
    };

    return Joi.validate(user, schema);
}

exports.validateNews = validateNews;
exports.News = News;

