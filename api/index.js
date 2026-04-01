import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoutes from "../routes/auth.js";

dotenv.config();

const app = express();

app.use(express.json());

// 🔥 ROOT DEBUG (ENG MUHIM)
app.get("/", (req, res) => {
    res.json({
        status: "OK",
        message: "Quizzo backend working 🚀",
        time: new Date(),
    });
});

// 🔥 TEST ENDPOINT (errorlarni ko‘rsatadi)
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
        message: "Test endpoint working 🚀",
        env: {
            MONGO_URI: process.env.MONGO_URI ? "EXISTS" : "MISSING",
            BOT_TOKEN: process.env.BOT_TOKEN ? "EXISTS" : "MISSING",
        },
        mongodb: {
            state: mongoState,
            status: mongoStatus,
        },
        time: new Date(),
    });
});

// 🔥 AUTH ROUTE
app.use("/api/auth", authRoutes);

// ❗ Mongo connect (simple)
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Mongo connected"))
    .catch((err) => console.error("Mongo error:", err));

// ❗ EXPORT
export default app;