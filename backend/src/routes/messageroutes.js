//C:\Users\HP\dereeves\backend\src\routes\messageroutes.js
import express from "express";
import { getMessages, sendMessage, getAdmin, getUnreadCounts } from "../controllers/messagecontroller.js";
import { protect } from "../middleware/authmiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get admin user (must come before /:userId)
router.get("/admin/info", getAdmin);

// Get unread message counts
router.get("/unread/counts", getUnreadCounts);

// Get messages between current user and specific user
router.get("/:userId", getMessages);

// Send a message
router.post("/", sendMessage);

export default router;