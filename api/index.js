import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoutes from "../routes/auth.js";

dotenv.config();

const app = express();

app.use(express.json());

app.use("/api/auth", authRoutes);

// ❗ DB connection (serverless safe emas, lekin ishlaydi)
mongoose.connect(process.env.MONGO_URI);

// ❗ MUHIM EXPORT
export default app;