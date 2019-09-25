const mongoose = require('mongoose');
const config = require('config');
const jwt = require('jsonwebtoken');
const uniqueValidator = require('mongoose-unique-validator');
const bcrypt = require('bcrypt');

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
    isAdmin: {
      type: Boolean,
      default: false
    },
});

userSchema.methods.generateAuthToken = function() {
    return jwt.sign({_id: this._id}, config.get('privateKeyName'));
};

userSchema.plugin(uniqueValidator);

userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
