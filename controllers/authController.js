// controllers/authController.js

import User from "../models/User.js";

function generateReferralCode() {
    return Math.random().toString(36).substring(2, 8);
}

export const telegramAuth = async (req, res) => {
    try {
        const { initDataRaw } = req.body;

        if (!initDataRaw) {
            return res.status(400).json({
                success: false,
                message: "initDataRaw required",
            });
        }

        const params = new URLSearchParams(initDataRaw);
        const userStr = params.get("user");

        if (!userStr) {
            return res.status(400).json({
                success: false,
                message: "Telegram user data not found",
            });
        }

        const tgUser = JSON.parse(userStr);
        const telegramId = tgUser.id.toString();

        // 🔥 UPSERT (register + login)
        const user = await User.findOneAndUpdate(
            { telegramId },
            {
                $set: {
                    telegramId,
                    username: tgUser.username || "",
                    firstName: tgUser.first_name || "",
                    lastName: tgUser.last_name || "",
                    photoUrl: tgUser.photo_url || "",
                    lastActiveAt: new Date(),
                },
                $setOnInsert: {
                    referralCode: generateReferralCode(),
                    createdAt: new Date(),
                },
            },
            {
                new: true,
                upsert: true,
            }
        );

        return res.json({
            success: true,
            user,
        });
    } catch (err) {
        console.error("Auth error:", err);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};