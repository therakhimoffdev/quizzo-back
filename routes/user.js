import express from "express";
import User from "../models/User.js";

const router = express.Router();

// GET /api/users/:telegramId
router.get("/:telegramId", async (req, res) => {
    try {
        const user = await User.findOne({ telegramId: req.params.telegramId });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

export default router;