const mongoose = require('mongoose');
const Joi = require('@hapi/joi');

const newsScheme = new mongoose.Schema({
    news_title: {
        type: String,
        unique: true,
        required: true,
        maxlength: 40
    },
    news_description: {
        type: String,
        required: true,
        minlength: 10,
        maxlength: 140
    },
    published_date: {
        type: String
    },
    last_edited: {
        type: String
    },
    is_published: {
        type: Boolean,
        default: true
    }
});

const News = mongoose.model('News', newsScheme);

function validateNews(user) {
    const schema = Joi.object({
        news_title: Joi.string().max(125).required(),
        news_description: Joi.string().min(10).max(140).required(),
    });

    return schema.validate(user);
}


exports.validateNews = validateNews;
exports.News = News;

