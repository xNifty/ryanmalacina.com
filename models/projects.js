import mongoose from 'mongoose';
import Joi from '@hapi/joi';

const projectScheme = new mongoose.Schema({
    project_name: {
        type: String,
        unique: true,
        required: true,
        maxlength: 125
    },
    project_title: {
        type: String,
        unique: true,
        required: true,
        maxlength: 125
    },
    project_source: {
        type: String,
        required: true,
        maxlength: 100
    },
    project_description_markdown: {
        type: String,
        required: true,
        minlength: 10,
        maxlength: 25000
    },
    project_description_html: {
        type: String,
        minlength: 10,
        maxlength: 25000
    },
    project_image: {
        type: String,
        maxlength: 150,
    },
    last_edited: {
        type: String
    },
    is_published: {
        type: Boolean,
        default: false
    },
    show_index: {
        type: Boolean,
        default: false
    }
});

// const Project = mongoose.model('Project', projectScheme);

export function validateProject(user) {
    const schema = Joi.object({
        project_name: Joi.string().max(125).required(),
        project_title: Joi.string().max(125).required(),
        project_source: Joi.string().max(100).required(),
        project_description: Joi.string().min(20).max(10000).required(),
        project_image: Joi.string().max(150).allow('')
    });

    return schema.validate(user);
}

// exports.validateProject = validateProject;

export default {
    validateProject
}
export const Project = mongoose.model('Project', projectScheme);