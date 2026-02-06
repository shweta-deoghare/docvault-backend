// src/models/Category.js
import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdByRole: { type: String, enum: ["admin", "user"], required: true },
  },
  { timestamps: true }
);

const Category = mongoose.model("Category", categorySchema);

// Helper to ensure default categories exist for admin
export const ensureAdminDefaultCategories = async () => {
  const defaultCategories = ["Personal", "Academic", "Financial", "Business"];
  const existing = await Category.find({ createdByRole: "admin" });

  if (existing.length === 0) {
    const adminId = null; // if you don’t have a specific admin ID, can be null or set a default
    const toCreate = defaultCategories.map(name => ({
      name,
      createdBy: adminId,
      createdByRole: "admin"
    }));
    await Category.insertMany(toCreate);
    console.log("Default admin categories created!");
  }
};

export default Category;