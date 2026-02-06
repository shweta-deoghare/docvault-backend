// Backend: routes/testUpload.js
import express from "express";
import multer from "multer";
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Test upload route
router.post("/test-upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    console.log("File received:", req.file.originalname);
    res.status(201).json({ message: "File uploaded successfully", filename: req.file.originalname });
  } catch (err) {
    console.error("Upload failed:", err);
    res.status(500).json({ message: "Upload failed" });
  }
});

export default router;