import express from "express";
const router = express.Router();
import {
  register,
  verifyRegisterOtp,
  resendRegisterOtp,
  login,
  adminLogin,
  getMe,
  updateProfile,
  logout,
  seedAdmin,
  setRole,
} from "../controllers/user.controller.js";
import { verifyToken } from "../Middleware/auth.middleware.js";

// Public Auth Routes
router.post("/register", register);
router.post("/verify-register-otp", verifyRegisterOtp);
router.post("/resent-register-otp", resendRegisterOtp);
router.post("/login", login);
router.post("/admin/login", adminLogin);
router.post("/logout", logout);
router.get("/seed-admin", seedAdmin);
router.post("/seed-admin", seedAdmin);
router.post("/set-role", setRole);

// Protected User Routes (Authentication required)
router.get("/me", verifyToken, getMe);
router.put("/profile", verifyToken, updateProfile);

export default router;
