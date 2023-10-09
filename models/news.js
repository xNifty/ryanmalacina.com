import mongoose from 'mongoose';
import Joi from '@hapi/joi';
import mongoosePaginate from 'mongoose-paginate-v2'

const newsScheme = new mongoose.Schema({
    news_title: {
        type: String,
        unique: true,
        required: true,
        maxlength: 40
    },
    news_description_markdown: {
        type: String,
        required: true,
        minlength: 10,
        maxlength: 1000
    },
    news_description_html: {
        type: String,
        minlength: 10,
        maxlength: 2000 // to be safe when markdown is converted
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
    },
    news_clean_output: {
        type: String,
        minlength: 10,
        maxlength: 2000
    }
});

newsScheme.index({news_search: "text", news_title: "text"});

newsScheme.plugin(mongoosePaginate);

// const News = mongoose.model('News', newsScheme);

function validateNews(user) {
    const schema = Joi.object({
        news_title: Joi.string().max(125).required(),
        news_description: Joi.string().min(10).max(1000).required(),
    });

    return schema.validate(user);
}


// exports.validateNews = validateNews;

export { validateNews as validateNews }

export const News = mongoose.model('News', newsScheme);