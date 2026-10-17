import jwt from "jsonwebtoken";
import UserModel from "../models/user.model.js";

export const verifyToken = async (req, res, next) => {
  try {
    let token = null;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login.",
      });
    }

    const secret =
      process.env.SECRET_KEY ||
      "nestro_jwt_secret_key_2026_super_secure_auth";

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token. Please login again.",
      });
    }

    const user = await UserModel.findById(decoded._id).select(
      "-password -otp -otpExpire"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found. Please register or login.",
      });
    }

    if (user.status === false) {
      return res.status(403).json({
        success: false,
        message: "Your account is deactivated. Please contact support.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication error",
      error: error.message,
    });
  }
};

export const requireAdmin = (req, res, next) => {
  if (
    !req.user ||
    (req.user.role !== "admin" && req.user.role !== "superAdmin")
  ) {
    return res.status(403).json({
      success: false,
      message: "Access forbidden. Admin privileges required.",
    });
  }
  next();
};

export const requireRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires one of: ${roles.join(", ")}`,
      });
    }
    next();
  };
};
