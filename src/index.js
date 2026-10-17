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
server.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);
server.use("/api/category", CategoRyrouter);
server.use("/api/room", roomrouter);
server.use("/api/product", productrouter);
server.use("/api/user", userrouter);
server.use("/api/order", orderrouter);

mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => {
    server.listen(process.env.PORT || 5000, () => {
      console.log("server running on 5000 port ");

      console.log("database is connected  ");
    });
  })
  .catch(() => {
    console.log("database not connected");
  });
