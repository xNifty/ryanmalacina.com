const mongoose = require('mongoose');

const projectScheme = new mongoose.Schema({
    name: String,
    title: String,
    source: String,
    description: String,
    imgURL: String
});

const Project = mongoose.model('Project', projectScheme);

exports.Project = Project;

