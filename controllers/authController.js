// controllers/authController.js

import User from "../models/User.js";

function generateReferralCode() {
    return Math.random().toString(36).substring(2, 8);
}

export const telegramAuth = async (req, res) => {
    console.log("=================================");
    console.log("🔐 TELEGRAM AUTH STARTED");
    console.log("📦 BODY:", JSON.stringify(req.body));
    console.log("=================================");

    try {
        const { initDataRaw } = req.body;

        if (!initDataRaw) {
            console.log("❌ initDataRaw YO'Q — body bo'sh keldi");
            return res.status(400).json({
                success: false,
                message: "initDataRaw required",
            });
        }

        console.log("✅ initDataRaw keldi, uzunligi:", initDataRaw.length);
        console.log("📄 initDataRaw:", initDataRaw);

        const params = new URLSearchParams(initDataRaw);
        const userStr = params.get("user");

        console.log("👤 userStr:", userStr);

        if (!userStr) {
            console.log("❌ 'user' parametri topilmadi");
            return res.status(400).json({
                success: false,
                message: "Telegram user data not found",
            });
        }

        const tgUser = JSON.parse(userStr);
        const telegramId = tgUser.id.toString();

        console.log("✅ Telegram user parse qilindi:");
        console.log("   id:", telegramId);
        console.log("   username:", tgUser.username);
        console.log("   firstName:", tgUser.first_name);
        console.log("   lastName:", tgUser.last_name);

        console.log("⏳ MongoDB ga saqlanyapti...");

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
                returnDocument: 'after',
                upsert: true,
            }
        );

        console.log("✅ User saqlandi:", user._id);
        console.log("=================================");

        return res.json({
            success: true,
            user,
        });

    } catch (err) {
        console.error("❌ AUTH ERROR:", err.message);
        console.error("❌ STACK:", err.stack);

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message, // ← dev uchun
        });
    }
};