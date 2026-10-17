import express from "express";
import upload from "../Middleware/Middleware.js";
import { create, read, readById, deleteById, update, status } from "../CONTROLLERS/Category.controller.js";

const router = express.Router();

router.post("/create", upload.single('image'), create);
router.get("/", read);
router.get("/:id", readById);
router.delete("/:id", deleteById);
router.patch("/update/:id", upload.single('image'), update);
router.patch("/status/:id", status);

export default router;