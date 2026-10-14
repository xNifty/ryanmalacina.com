import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 50,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 1024,
  },
  realName: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 50,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  const hash = await bcrypt.hash(
    this.password,
    Number(process.env.BCRYPT_SALT)
  );
  this.password = hash;
  next();
});

userSchema.methods.validPassword = function (password) {
  return bcrypt.compare(password, this.password);
};

export const User = mongoose.model("User", userSchema);
