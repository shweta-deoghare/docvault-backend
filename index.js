import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import Category from "./models/Category.js";
// import notificationsRouter from "./routes/Notification.js";
import notificationsRoutes from "./routes/Notification.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications",notificationsRoutes);

// If your frontend uses `/documents/...` directly
app.use("/documents", documentRoutes);

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/docvault");
    console.log("MongoDB connected");

    // Create default categories
    const defaults = ["Business", "Personal", "Financial", "Academic"];
    for (const name of defaults) {
      const exists = await Category.findOne({ name, userId: null });
      if (!exists) {
        await Category.create({ name, userId: null });
        console.log(`Default category created: ${name}`);
      }
    }

    app.listen(5000, () => console.log("Server running on port 5000"));
  } catch (err) {
    console.error("Error starting server:", err);
  }
};



startServer();