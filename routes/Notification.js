import express from "express";
import Notification from "../models/Notification.js";
import { isAuth } from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

// ================= GET NOTIFICATIONS =================
router.get("/", isAuth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId).select("role");

    let filter = { userId: req.userId };

    // 🔒 Admin should see ONLY admin → admin notifications
    if (currentUser.role === "admin") {
      filter.senderRole = "admin";
    }

    const notifications = await Notification.find(filter).sort({
      createdAt: -1,
    });

    res.json(notifications);
  } catch (err) {
    console.error("NOTIFICATION FETCH ERROR:", err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// ================= MARK AS READ =================
router.put("/:id/read", isAuth, async (req, res) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif)
      return res.status(404).json({ message: "Notification not found" });

    if (notif.userId.toString() !== req.userId)
      return res.status(403).json({ message: "Access denied" });

    notif.read = true;
    await notif.save();

    res.json({ message: "Marked as read" });
  } catch (err) {
    console.error("MARK READ ERROR:", err);
    res.status(500).json({ message: "Failed to update notification" });
  }
});

// ================= DELETE =================
router.delete("/:id", isAuth, async (req, res) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif)
      return res.status(404).json({ message: "Notification not found" });

    if (notif.userId.toString() !== req.userId)
      return res.status(403).json({ message: "Access denied" });

    await Notification.deleteOne({ _id: notif._id });
    res.json({ message: "Notification deleted" });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ message: "Failed to delete notification" });
  }
});

export default router;