import express from "express";
import multer from "multer";
import mongoose from "mongoose";
import { isAuth } from "../middleware/auth.js";
import Document from "../models/Document.js";
import { minioClient } from "../config/minio.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// =================== PERMISSION CHECK ===================
const hasPermission = (doc, userId, userRole, action) => {
  if (userRole === "admin") return true; // Admin can do everything
  if (doc.userId && doc.userId.toString() === userId.toString()) return true; // Owner

  const assignedEntry = doc.assignedTo?.find(a => {
    if (!a.userId) return false;
    const uid = a.userId._id ? a.userId._id.toString() : a.userId.toString();
    return uid === userId.toString();
  });

  return assignedEntry?.permissions?.[action] === true;
};

// ================= BULK DELETE DOCUMENTS =================
// ================= BULK DELETE DOCUMENTS =================
router.delete("/bulk-delete", isAuth, async (req, res) => {
  try {
    const { documentIds } = req.body;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ message: "No documents selected" });
    }

    const userId = req.userId;
    const role = req.userRole;

    // Fetch documents
    const documents = await Document.find({ _id: { $in: documentIds } });

    if (documents.length === 0) {
      return res.status(404).json({ message: "Documents not found" });
    }

    // 🔐 PERMISSION CHECK
    for (const doc of documents) {
      // Admin can delete anything
      if (role === "admin") continue;

      // User can delete ONLY own documents
      if (doc.userId.toString() !== userId.toString()) {
        return res.status(403).json({
          message: "You can delete only your own documents",
        });
      }
    }

    // 🔥 Delete files from MinIO
    for (const doc of documents) {
      if (doc.minioPath) {
        try {
          await minioClient.removeObject(
            process.env.MINIO_BUCKET || "documents",
            doc.minioPath
          );
        } catch (err) {
          console.error("MINIO DELETE ERROR:", err);
        }
      }
    }

    // 🗑 Delete from MongoDB
    await Document.deleteMany({ _id: { $in: documentIds } });

    res.json({
      message: "Documents deleted successfully",
      deletedCount: documents.length,
    });
  } catch (err) {
    console.error("BULK DELETE ERROR:", err);
    res.status(500).json({ message: "Failed to delete documents" });
  }
});

// =================== UPLOAD DOCUMENT ===================
router.post("/upload", isAuth, upload.single("file"), async (req, res) => {
  try {
    const { categoryId } = req.body;
    const file = req.file;

    if (!file || !categoryId) return res.status(400).json({ message: "File and category required" });

    const objectName = `${Date.now()}-${file.originalname}`;
    await minioClient.putObject("documents", objectName, file.buffer);

    const document = await Document.create({
      filename: file.originalname,
      mimetype: file.mimetype,
      minioPath: objectName,
      categoryId,
      userId: req.userId,
      assignedTo: [],
    });

    res.status(201).json(document);
  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    res.status(500).json({ message: "Upload failed" });
  }
});

// =================== GET ALL DOCUMENTS ===================
// =================== GET ALL DOCUMENTS ===================
router.get("/", isAuth, async (req, res) => {
  try {
    const { categoryId, search, fileType, userId } = req.query;
    let filter = {};

    if (req.userRole === "user") {
      // Normal user → only own docs
      filter.userId = req.userId;
    }

    if (req.userRole === "admin") {
      if (userId) {
        // Admin User Details page → selected user's uploads
        filter.userId = userId;
      } else {
        // Categories / Upload page → admin's own uploads ONLY
        filter.userId = req.userId;
      }
    }

    if (categoryId) filter.categoryId = categoryId;
    if (fileType) filter.mimetype = fileType;
    if (search) filter.filename = { $regex: search, $options: "i" };

    const documents = await Document.find(filter)
      .sort({ createdAt: -1 })
      .populate("categoryId", "name")
      .populate("userId", "firstname lastname email")
      .populate("assignedTo.userId", "firstname lastname email");

    res.json(documents);
  } catch (err) {
    console.error("GET DOCUMENTS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch documents" });
  }
});
// =================== GET ASSIGNED DOCUMENTS ===================
// ==============
// =================== GET ASSIGNED DOCUMENTS ===================
// =================== GET ASSIGNED DOCUMENTS ===================
router.get("/assigned", isAuth, async (req, res) => {
  try {
    const { userId } = req.query; // selected user in admin panel

    if (!userId && req.userRole !== "user") {
      return res.status(400).json({ message: "userId is required for admin" });
    }

    // For normal users, fetch their own assigned docs
    const targetUserId = req.userRole === "user" ? req.userId : userId;

    // Find documents where the target user is in the assignedTo array
    const documents = await Document.find({ "assignedTo.userId": targetUserId })
      .sort({ createdAt: -1 })
      .populate("categoryId", "name")
      .populate("userId", "firstname lastname email")
      .populate("assignedTo.userId", "firstname lastname email");

    // Filter assignedTo array to only include the target user
    const filteredDocs = documents.map((doc) => {
      const assignedEntry = doc.assignedTo.find(
        (a) => a.userId._id.toString() === targetUserId
      );
      return {
        _id: doc._id,
        filename: doc.filename,
        mimetype: doc.mimetype,
        categoryId: doc.categoryId,
        userId: doc.userId,
        permissions: assignedEntry ? assignedEntry.permissions : {},
      };
    });

    console.log("ASSIGNED DOCS FOR USER:", filteredDocs);
    res.json(filteredDocs);
  } catch (err) {
    console.error("ASSIGNED DOCS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch assigned documents" });
  }
});
// ✅ ADMIN: fetch assigned docs for ANY user
// GET assigned documents for a specific user (ADMIN VIEW)
// GET assigned docs for a particular user (ADMIN)
// GET assigned docs for a particular user (ADMIN)
router.get("/assigned/by-user/:userId", isAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const docs = await Document.find({
      "assignedTo.userId": userId,
    })
      .populate("categoryId")
      .populate("userId")
      .lean();

    // 🔥 KEEP ONLY THIS USER IN assignedTo
    const filteredDocs = docs.map(doc => ({
      ...doc,
      assignedTo: doc.assignedTo.filter(
        a => String(a.userId) === String(userId)
      )
    }));

    res.json(filteredDocs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch assigned docs" });
  }
});
router.delete("/history/:docId/:index", async (req, res) => {
  try {
    const { docId, index } = req.params;

    const doc = await Document.findById(docId);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    doc.history.splice(index, 1);
    await doc.save();

    res.json({ message: "History deleted" });
  } catch {
    res.status(500).json({ message: "Delete failed" });
  }
});
router.get("/history/:id", async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    res.json(doc.history);
  } catch {
    res.status(500).json({ message: "Failed to fetch history" });
  }
});
// GET documents assigned to a specific user
router.get("/assigned/:userId", isAuth, async (req, res) => {
  const { userId } = req.params;

  const docs = await Document.find({
    "assignedTo.userId": userId
  })
    .populate("categoryId")
    .populate("userId");

  res.json(docs);
});
// =================== VIEW DOCUMENT ===================
router.get("/:id/view", isAuth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id).populate("assignedTo.userId", "_id");
    if (!doc) return res.status(404).json({ message: "Document not found" });

    if (!hasPermission(doc, req.userId, req.userRole, "view"))
      return res.status(403).json({ message: "You do not have permission to view this document" });

    const stream = await minioClient.getObject("documents", doc.minioPath);
    res.setHeader("Content-Type", doc.mimetype);
    stream.pipe(res);

    stream.on("error", (err) => {
      console.error("MINIO STREAM ERROR:", err);
      res.status(500).json({ message: "Failed to view document from storage" });
    });
  } catch (err) {
    console.error("VIEW ERROR:", err);
    res.status(500).json({ message: "Failed to view document" });
  }
});

// =================== DOWNLOAD DOCUMENT ===================
router.get("/:id/download", isAuth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id).populate("assignedTo.userId", "_id");
    if (!doc) return res.status(404).json({ message: "Document not found" });

    if (!hasPermission(doc, req.userId, req.userRole, "download"))
      return res.status(403).json({ message: "You do not have permission to download this document" });

    const stream = await minioClient.getObject("documents", doc.minioPath);
    res.setHeader("Content-Type", doc.mimetype);
    res.setHeader("Content-Disposition", `attachment; filename="${doc.filename}"`);
    stream.pipe(res);

    stream.on("error", (err) => {
      console.error("MINIO STREAM ERROR:", err);
      res.status(500).json({ message: "Failed to download document from storage" });
    });
  } catch (err) {
    console.error("DOWNLOAD ERROR:", err);
    res.status(500).json({ message: "Failed to download document" });
  }
});

// =================== REPLACE DOCUMENT ===================
// =================== REPLACE DOCUMENT ===================
// REPLACE DOCUMENT
router.put("/:id/replace", upload.single("file"), async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    // Upload new file to MinIO
    const file = req.file;
    if (!file) return res.status(400).json({ message: "File required" });

    const objectName = `${Date.now()}-${file.originalname}`;
    await minioClient.putObject("documents", objectName, file.buffer);

    // 🔹 Save old version into history
    doc.history.push({
      filename: doc.filename,
      minioPath: doc.minioPath,   // save MinIO path
      mimetype: doc.mimetype,
      replacedAt: new Date(),
    });

    // 🔹 Replace with new file
    doc.filename = file.originalname;
    doc.minioPath = objectName;
    doc.mimetype = file.mimetype;

    await doc.save();

    res.json({ document: doc });
  } catch (err) {
    console.error("REPLACE ERROR:", err);
    res.status(500).json({ message: "Replace failed" });
  }
});
// VIEW HISTORY ITEM
router.get("/:id/history/:index/view", isAuth, async (req, res) => {
  try {
    const { id, index } = req.params;
    const doc = await Document.findById(id);
    if (!doc || !doc.history[index]) return res.status(404).json({ message: "History not found" });

    const item = doc.history[index];
    const stream = await minioClient.getObject("documents", item.minioPath);
    res.setHeader("Content-Type", item.mimetype);
    stream.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to view history" });
  }
});

// DOWNLOAD HISTORY ITEM
router.get("/:id/history/:index/download", isAuth, async (req, res) => {
  try {
    const { id, index } = req.params;
    const doc = await Document.findById(id);
    if (!doc || !doc.history[index]) return res.status(404).json({ message: "History not found" });

    const item = doc.history[index];
    const stream = await minioClient.getObject("documents", item.minioPath);
    res.setHeader("Content-Type", item.mimetype);
    res.setHeader("Content-Disposition", `attachment; filename="${item.filename}"`);
    stream.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to download history" });
  }
});
// =================== ASSIGN DOCUMENT ===================
// =================== ASSIGN DOCUMENT ===================
// =================== ASSIGN DOCUMENT ===================
router.post("/:id/assign", isAuth, async (req, res) => {
  try {
    const { assignments } = req.body;

    // ✅ Validate payload
    if (!Array.isArray(assignments)) {
      return res.status(400).json({ message: "Invalid assignments payload" });
    }

    // ✅ Only admin can assign
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Only admin can assign documents" });
    }

    // ✅ Find document
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    // ✅ Filter valid assignments
    const validAssignments = assignments.filter(
      (a) =>
        mongoose.Types.ObjectId.isValid(a.userId) &&
        a.permissions &&
        (a.permissions.view || a.permissions.download || a.permissions.update)
    );

    // ✅ Save assignments in document
    doc.assignedTo = validAssignments.map((a) => ({
      userId: new mongoose.Types.ObjectId(a.userId),
      permissions: {
        view: !!a.permissions.view,
        download: !!a.permissions.download,
        update: !!a.permissions.update,
      },
      assignedAt: new Date(),
    }));

    await doc.save();

    // ✅ Remove old notifications for this document
    await Notification.deleteMany({ documentId: doc._id });

    // ✅ CREATE notifications (FIXED senderRole)
    if (validAssignments.length > 0) {
      const notifications = validAssignments.map((a) => ({
        userId: a.userId,
        documentId: doc._id,
        senderRole: req.userRole, // 🔥 REQUIRED FIELD FIX
        message: `A new document "${doc.filename}" has been assigned to you.`,
        link: "/assigned-documents",
        read: false,
      }));

      await Notification.insertMany(notifications);
    }

    res.json({ message: "Document assigned successfully" });
  } catch (err) {
    console.error("ASSIGN ERROR FULL:", err);
    res.status(500).json({ message: "Assignment failed" });
  }
});
// =================== GET SINGLE DOCUMENT ===================
router.get("/:id", isAuth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate("assignedTo.userId", "firstname lastname email")
      .populate("userId", "firstname lastname email")
      .populate("categoryId", "name")
      .lean();

    if (!doc) return res.status(404).json({ message: "Document not found" });

    doc.assignedTo = doc.assignedTo.map(a => ({
      userId: a.userId?._id?.toString(),
      user: a.userId,
      permissions: {
        view: !!a.permissions?.view,
        download: !!a.permissions?.download,
        update: !!a.permissions?.update,
      },
    }));

    res.json(doc);
  } catch (err) {
    console.error("GET DOC ERROR:", err);
    res.status(500).json({ message: "Failed to fetch document" });
  }
});

// =================== DELETE DOCUMENT ===================
router.delete("/:id", isAuth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    if (req.userRole !== "admin" && doc.userId.toString() !== req.userId)
      return res.status(403).json({ message: "Access denied" });

    if (doc.minioPath) await minioClient.removeObject("documents", doc.minioPath);
    await Document.deleteOne({ _id: doc._id });

    res.json({ message: "Document deleted successfully" });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ message: "Failed to delete document" });
  }
});

export default router;