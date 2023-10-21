import mongoose from 'mongoose';
import config from 'config';
import jwt from 'jsonwebtoken';
import uniqueValidator from 'mongoose-unique-validator';
import bcrypt from 'bcrypt';

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
    return jwt.sign({_id: this._id}, process.env.privateKey);
};

userSchema.plugin(uniqueValidator);

userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};

export const User = mongoose.model('User', userSchema);
