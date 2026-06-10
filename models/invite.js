import mongoose from "mongoose";

const inviteSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  inviteCode: {
    type: String,
    required: true,
    unique: true,
  },
  inviteused: {
    type: Number,
    default: 0,
    min: 0,
    max: 1,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Invite = mongoose.model("Invite", inviteSchema);
