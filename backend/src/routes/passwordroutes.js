import express from "express";
import { forgotPassword, resetPassword, changePassword } from "../controllers/passwordcontroller.js";
import { protect } from "../middleware/authmiddleware.js";

const router = express.Router();

// Public routes
router.post("/forgot", forgotPassword);
router.post("/reset", resetPassword);

// Protected route (requires login)
router.post("/change", protect, changePassword);

export default router;