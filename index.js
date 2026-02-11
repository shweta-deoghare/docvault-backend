import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import notificationsRoutes from "./routes/Notification.js";
import User from "./models/User.js";
import Category from "./models/Category.js";
import { minioClient } from "./config/minio.js"; // ✅ ADD THIS

dotenv.config();

const app = express();

app.use(cors({
  origin: "https://docvault-frontend-88hr-bnxcub6vf-shweta-deoghares-projects.vercel.app",
  credentials: true
}));

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationsRoutes);

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // ✅ ENSURE MINIO BUCKET EXISTS
    const bucket = process.env.MINIO_BUCKET || "documents";
    const exists = await minioClient.bucketExists(bucket);

    if (!exists) {
      await minioClient.makeBucket(bucket);
      console.log("✅ MinIO bucket created:", bucket);
    }

    // Create default admin if not exists
    let admin = await User.findOne({ role: "admin" });
    if (!admin) {
      admin = await User.create({
        firstname: "Admin",
        lastname: "User",
        email: "admin@example.com",
        password: "Admin@123",
        role: "admin"
      });
      console.log("✅ Default admin created:", admin.email);
    }

    // Create default categories
    const defaultCategories = ["Business", "Personal", "Financial", "Academic"];
    for (const name of defaultCategories) {
      const exists = await Category.findOne({ name });
      if (!exists) {
        await Category.create({
          name,
          createdBy: admin._id,
          createdByRole: "admin"
        });
        console.log(`✅ Default category created: ${name}`);
      }
    }

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error("❌ Server start error:", err);
  }
};

startServer();