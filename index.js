import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import notificationsRoutes from "./routes/Notification.js";
import Category from "./models/Category.js";
import simpleAuthRoutes from "./routes/simpleAuth.js";

dotenv.config();

const app = express();

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

// Routes
// app.use("/api/auth", authRoutes);
app.use("/api/simple-auth",simpleAuthRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/documents", documentRoutes);
// app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/documents", documentRoutes);


const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // ✅ VALID admin ObjectId (dummy but valid)
    const ADMIN_ID = new mongoose.Types.ObjectId("000000000000000000000001");

    // Create default categories
    const defaults = ["Business", "Personal", "Financial", "Academic"];

    for (const name of defaults) {
      const exists = await Category.findOne({ name });

      if (!exists) {
        await Category.create({
          name,
          createdBy: ADMIN_ID,     // ✅ REQUIRED
          createdByRole: "admin", // ✅ VALID ENUM
        });

        console.log(`Default category created: ${name}`);
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