const mongoose = require('mongoose');
const Joi = require('Joi');
const config = require('config');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 50
    },
    password: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 1024
    },
    realName: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 50
    },
});

userSchema.methods.generateAuthToken = function() {
    return jwt.sign({_id: this._id}, config.get('rmPrivateKey'));
};

const User = mongoose.model('User', userSchema);

function validate(user) {
    const schema = {
        username: Joi.string().min(5).max(255).required(),
        password: Joi.string().min(5).max(255).required()
    };

    return Joi.validate(user, schema);
}

exports.User = User;
exports.validate = validate;