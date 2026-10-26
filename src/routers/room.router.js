import express from "express";
import upload from "../Middleware/Middleware.js";
import {
  createroom,
  readroom,
  readById,
  deleteById,
  updateById,
  status,
} from "../controllers/room.controller.js";
import { verifyToken, requireAdmin } from "../Middleware/auth.middleware.js";

const router = express.Router();

// Public routes
router.get("/", readroom);
router.get("/:id", readById);

// Admin protected routes
router.post("/create", verifyToken, requireAdmin, upload.single("image"), createroom);
router.patch("/update/:id", verifyToken, requireAdmin, upload.single("image"), updateById);
router.patch("/status/:id", verifyToken, requireAdmin, status);
router.delete("/:id", verifyToken, requireAdmin, deleteById);

export default router;