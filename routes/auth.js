// routes/auth.js
import express from "express";
import { telegramAuth } from "../controllers/authController.js";

const router = express.Router();

router.post("/telegram", telegramAuth);

export default router;