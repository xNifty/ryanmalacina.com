const mongoose = require('mongoose');
const Joi = require('joi');

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
    project_description: {
        type: String,
        required: true,
        minlength: 20,
        maxlength: 10000
    },
    project_image: {
        type: String,
        maxlength: 150
    }
});

const Project = mongoose.model('Project', projectScheme);

function validateProject(user) {
    const schema = {
        project_name: Joi.string().max(125).required(),
        project_title: Joi.string().max(125).required(),
        project_source: Joi.string().max(100).required(),
        project_description: Joi.string().min(20).max(10000).required(),
        project_image: Joi.string().max(150)
    };

    return Joi.validate(user, schema);
}

exports.validate = validateProject;
exports.Project = Project;

