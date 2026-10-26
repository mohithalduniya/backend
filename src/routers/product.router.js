import express from "express";
import {
  create,
  deleteById,
  read,
  readById,
  status,
  update,
  updateFlag,
} from "../controllers/product.controller.js";
import upload from "../Middleware/Middleware.js";
import { verifyToken, requireAdmin } from "../Middleware/auth.middleware.js";

const router = express.Router();

// Public routes for storefront
router.get("/", read);
router.get("/:id", readById);

// Admin protected routes
router.post("/create", verifyToken, requireAdmin, upload.single("image"), create);
router.put("/update/:id", verifyToken, requireAdmin, upload.single("image"), update);
router.patch("/status/:id", verifyToken, requireAdmin, status);
router.patch("/flag/:id", verifyToken, requireAdmin, updateFlag);
router.delete("/delete/:id", verifyToken, requireAdmin, deleteById);
router.delete("/:id", verifyToken, requireAdmin, deleteById);

export default router;