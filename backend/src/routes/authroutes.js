//C:\Users\HP\dereeves\backend\src\routes\authroutes.js
import express from "express";
import { registerUser, loginUser, getMe, verifyEmail } from "../controllers/authcontroller.js";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import { getAllUsers } from "../controllers/usercontroller.js";
import { verifyToken, isAdmin, protect } from "../middleware/authmiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/verify-email/:token", verifyEmail);

// Protected routes
router.get("/", verifyToken, isAdmin, getAllUsers);
router.get("/me", protect, getMe);

// Profile route with inline handler
router.get("/profile", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    res.json(user);
  } catch (error) {
    res.status(401).json({ message: "Invalid token", error: error.message });
  }
});

export default router;