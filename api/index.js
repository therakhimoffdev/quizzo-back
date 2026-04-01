import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoutes from "../routes/auth.js";

dotenv.config();

const app = express();
app.use(express.json());

// 🔥 Mongo connection (FIX)
let isConnected = false;

const connectDB = async () => {
    if (isConnected) return;

    try {
        await mongoose.connect(process.env.MONGO_URI);
        isConnected = true;
        console.log("Mongo connected ✅");
    } catch (err) {
        mongoError = err.message;
        console.error("Mongo error ❌", err);
    }
};

// 🔥 HAR REQUEST oldidan Mongo ulanishni kutadi
app.use(async (req, res, next) => {
    await connectDB();
    next();
});

// 🔥 ROOT
app.get("/", (req, res) => {
    res.json({
        status: "OK",
        message: "Quizzo backend working 🚀",
        time: new Date(),
    });
});

// 🔥 TEST
app.get("/test", (req, res) => {
    const mongoState = mongoose.connection.readyState;

    let mongoStatus = "UNKNOWN";

    switch (mongoState) {
        case 0:
            mongoStatus = "DISCONNECTED ❌";
            break;
        case 1:
            mongoStatus = "CONNECTED ✅";
            break;
        case 2:
            mongoStatus = "CONNECTING ⏳";
            break;
        case 3:
            mongoStatus = "DISCONNECTING ⚠️";
            break;
    }

    res.json({
        status: "OK",
        env: {
            MONGO_URI: process.env.MONGO_URI ? "EXISTS" : "MISSING",
        },
        mongodb: {
            state: mongoState,
            status: mongoStatus,
            error: mongoError
        }
    });
});

// 🔥 ROUTES
app.use("/api/auth", authRoutes);

export default app;