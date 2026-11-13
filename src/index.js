import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import CategoRyrouter from "./routers/category.router.js";
import roomrouter from "./routers/room.router.js";
import productrouter from "./routers/product.router.js";
import userrouter from "./routers/user.router.js";
import orderrouter from "./routers/order.router.js";
import contactrouter from "./routers/contact.router.js";

const server = express();
server.use(express.json());
server.use(cookieParser());
server.use('/uploads', express.static('uploads'));

const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

server.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps, curl, or server-side fetch)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        /\.vercel\.app$/.test(origin) ||
        process.env.NODE_ENV !== "production"
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// Health check endpoint for Render
server.get("/", (req, res) => {
  res.json({ success: true, message: "Nestro API server is running." });
});

server.use("/api/category", CategoRyrouter);
server.use("/api/room", roomrouter);
server.use("/api/product", productrouter);
server.use("/api/user", userrouter);
server.use("/api/order", orderrouter);
server.use("/api/contact", contactrouter);

// Central error handler: upload (multer/Cloudinary) and other thrown errors
// now return JSON with the real reason instead of a bare HTML "Internal Server Error".
server.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || (err.name === "MulterError" ? 400 : 500);
  res.status(status).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

const PORT = process.env.PORT || 5000;

if (!process.env.SECRET_KEY) {
  console.warn("WARNING: SECRET_KEY is not set. Falling back to a public default; set it before going live.");
}
if (!process.env.RESEND_API_KEY) {
  console.warn("WARNING: RESEND_API_KEY is not set. OTP and contact emails will not be sent.");
}

mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log("Database connected successfully");
    });
  })
  .catch((err) => {
    console.error("Database connection error:", err?.message || err);
  });
