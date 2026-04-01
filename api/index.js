import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoutes from "../routes/auth.js";

dotenv.config();

const app = express();
app.use(express.json());

// 🔥 GLOBAL REQUEST LOGGER (ENG MUHIM)
app.use((req, res, next) => {
    console.log("=================================");
    console.log("📩 NEW REQUEST");
    console.log("➡️ METHOD:", req.method);
    console.log("➡️ URL:", req.originalUrl);
    console.log("➡️ BODY:", req.body);
    console.log("➡️ TIME:", new Date().toISOString());
    console.log("=================================");

    next();
});

// 🔥 Mongo state
let isConnected = false;
let mongoError = null;

// 🔥 Mongo connect
const connectDB = async () => {
    if (isConnected) return;

    try {
        console.log("⏳ Connecting to Mongo...");
        
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
        });

        isConnected = true;
        mongoError = null;

        console.log("✅ Mongo connected");
    } catch (err) {
        mongoError = err.message;
        console.error("❌ Mongo error:", err);
    }
};

// 🔥 Mongo middleware
app.use(async (req, res, next) => {
    await connectDB();
    next();
});

// 🔥 RESPONSE LOGGER (MUHIM)
app.use((req, res, next) => {
    const oldSend = res.send;

    res.send = function (data) {
        console.log("📤 RESPONSE:");
        console.log("⬅️ STATUS:", res.statusCode);
        console.log("⬅️ DATA:", data);
        console.log("=================================");

        return oldSend.apply(res, arguments);
    };

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
        mongodb: {
            state: mongoState,
            status: mongoStatus,
            error: mongoError,
        },
        time: new Date(),
    });
});

// 🔥 ROUTES
app.use("/api/auth", authRoutes);

// 🔥 NOT FOUND (MUHIM)
app.use((req, res) => {
    console.log("❌ ROUTE NOT FOUND:", req.originalUrl);

    res.status(404).json({
        message: "Route not found",
    });
});

// 🔥 GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
    console.error("🔥 GLOBAL ERROR:", err);

    res.status(500).json({
        message: "Internal Server Error",
        error: err.message,
    });
});

export default app;