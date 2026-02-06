import express from "express";
import Category from "../models/Category.js";
import { isAuth } from "../middleware/auth.js";

const router = express.Router();

// GET ALL CATEGORIES
router.get("/", isAuth, async (req, res) => {
  try {
    let categories;
    if (req.userRole === "admin") {
      // Admin sees only their own categories
      categories = await Category.find({ createdByRole: "admin" });
    } else {
      // User sees admin categories + their own
      categories = await Category.find({
        $or: [
          { createdByRole: "admin" },
          { createdBy: req.userId }
        ]
      });
    }

    res.json(categories);
  } catch (err) {
    console.error("Fetch categories error:", err);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
});
// ADD CATEGORY
router.post("/", isAuth, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) return res.status(400).json({ message: "Category name is required" });

    const newCategory = new Category({
      name,
      createdBy: req.userId,
      createdByRole: req.userRole,
    });

    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (err) {
    console.error("Add category error:", err);
    res.status(500).json({ message: "Failed to add category" });
  }
});

// DELETE CATEGORY
router.delete("/:id", isAuth, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    // Only admin or creator can delete
    if (req.userRole === "user" && category.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: "You can only delete your own categories" });
    }

    await Category.deleteOne({ _id: req.params.id });
    res.json({ message: "Category deleted successfully" });
  } catch (err) {
    console.error("Delete category error:", err);
    res.status(500).json({ message: "Failed to delete category" });
  }
});

export default router;