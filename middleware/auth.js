// src/middleware/auth.js
import jwt from "jsonwebtoken";

export const isAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.id || !decoded?.role) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // Attach user info to request
    req.userId = decoded.id;        // for createdBy
    req.userRole = decoded.role;    // for role-based access

    // Debug log
    console.log(`✅ Authenticated user: ${req.userId}, role: ${req.userRole}`);

    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    return res.status(401).json({ message: "Unauthorized" });
  }
};