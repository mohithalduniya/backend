import express from "express";
const router = express.Router();
import {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  getOrderStats,
} from "../controllers/order.controller.js";
import { verifyToken, requireAdmin } from "../Middleware/auth.middleware.js";

// Customer routes (requires authentication)
router.post("/create", verifyToken, createOrder);
router.get("/my-orders", verifyToken, getMyOrders);

// Admin routes (requires authentication + admin authorization)
router.get("/admin/all", verifyToken, requireAdmin, getAllOrders);
router.get("/admin/stats", verifyToken, requireAdmin, getOrderStats);
router.patch("/admin/status/:id", verifyToken, requireAdmin, updateOrderStatus);

// Single order detail
router.get("/:id", verifyToken, getOrderById);

export default router;
