// backend/src/routes/userroutes.js
import express from "express";
import { getAllUsers } from "../controllers/usercontroller.js";
import { verifyToken, isAdmin } from "../middleware/authmiddleware.js";

const router = express.Router();

// Only admins can get all users
router.get("/", verifyToken, isAdmin, getAllUsers);

export default router;