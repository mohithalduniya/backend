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

const PORT = process.env.PORT || 5000;

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
