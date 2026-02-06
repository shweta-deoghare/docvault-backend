// fixAssignedDocs.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Document from "./models/Document.js"; // <-- Adjust path if needed

dotenv.config();

// 1️⃣ Connect to MongoDB
const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/DocVault";

mongoose
  .connect(mongoURI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// 2️⃣ Function to fix assignedTo array
const fixAssignedDocs = async () => {
  try {
    const docs = await Document.find({});

    for (const doc of docs) {
      if (!Array.isArray(doc.assignedTo)) continue;

      // Remove duplicates or invalid entries
      const fixedAssigned = doc.assignedTo.filter(
        (a, index, self) =>
          a.userId && // must have a userId
          self.findIndex(
            (s) =>
              String(s.userId?._id || s.userId) === String(a.userId?._id || a.userId)
          ) === index // remove duplicates
      );

      doc.assignedTo = fixedAssigned;
      await doc.save();
      console.log(`✔️ Document fixed: ${doc.filename}`);
    }

    console.log("🎉 All documents fixed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error fixing documents:", err);
    process.exit(1);
  }
};

// Run the fix
fixAssignedDocs();