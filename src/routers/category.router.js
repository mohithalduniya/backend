import express from "express";
import upload from "../Middleware/Middleware.js";
import {
  create,
  read,
  readById,
  deleteById,
  update,
  status,
} from "../controllers/Category.controller.js";
import { verifyToken, requireAdmin } from "../Middleware/auth.middleware.js";

const router = express.Router();

// Public routes
router.get("/", read);
router.get("/:id", readById);

// Admin protected routes
router.post("/create", verifyToken, requireAdmin, upload.single("image"), create);
router.patch("/update/:id", verifyToken, requireAdmin, upload.single("image"), update);
router.patch("/status/:id", verifyToken, requireAdmin, status);
router.delete("/:id", verifyToken, requireAdmin, deleteById);

export default router;