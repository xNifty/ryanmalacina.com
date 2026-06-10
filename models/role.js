import mongoose from "mongoose";

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    maxlength: 50,
  },
  permissions: {
    type: [String],
    required: true,
    default: [],
  },
});

export const Role = mongoose.model("Role", roleSchema);

