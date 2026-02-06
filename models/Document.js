import mongoose from "mongoose";

const assignedSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    permissions: {
      view: { type: Boolean, default: false },
      download: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
    },
    assignedAt: {
      type: Date,
      default: Date.now,   // ✅ THIS FIXES EVERYTHING
    },
  },
  { _id: false }
);

// 🔹 History schema
const historySchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
    },
    minioPath: {
      type: String,
      required: true,
    },
    mimetype: {
      type: String,
      required: true,
    },
    replacedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
    },
    minioPath: {
      type: String,
      required: true,
    },
    mimetype: {
      type: String,
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    assignedTo: [assignedSchema],
    history: [historySchema],
  },
  { timestamps: true }
);

export default mongoose.model("Document", documentSchema);