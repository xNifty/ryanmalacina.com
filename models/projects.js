const mongoose = require('mongoose');

const projectScheme = new mongoose.Schema({
    title: String,
    source: String,
    description: String
});

const Projects = mongoose.model('Projects', projectScheme);

exports.Projects = Projects;

