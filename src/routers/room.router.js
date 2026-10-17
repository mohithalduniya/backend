import express from "express";
import upload from "../Middleware/Middleware.js";
import { createroom, readroom ,readById, deleteById, updateById} from "../controllers/room.controller.js";

const router = express.Router();

router.post("/create", upload.single('image'), createroom);
router.get("/", readroom);
router.get("/:id", readById);
router.delete("/:id", deleteById);
router.patch("/update/:id", upload.single('image'), updateById);


export default router;