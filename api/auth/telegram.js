// api/auth/telegram.js

import { connectDB } from "../../lib/db.js";
import User from "../../models/User.js";
import { verifyTelegram } from "../../utils/verifyTelegram.js";

function generateReferralCode() {
    return Math.random().toString(36).substring(2, 8);
}

export default async function handler(req, res) {
    // ❗ faqat POST
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method not allowed" });
    }

    try {
        await connectDB();

        const { initDataRaw } = req.body;

        if (!initDataRaw) {
            return res.status(400).json({ message: "initDataRaw required" });
        }

        const isValid = verifyTelegram(
            initDataRaw,
            process.env.BOT_TOKEN
        );

        if (!isValid) {
            return res.status(401).json({ message: "Invalid Telegram data" });
        }

        const params = new URLSearchParams(initDataRaw);
        const tgUser = JSON.parse(params.get("user"));

        const telegramId = tgUser.id.toString();

        const user = await User.findOneAndUpdate(
            { telegramId },
            {
                $set: {
                    username: tgUser.username || "",
                    firstName: tgUser.first_name || "",
                    lastName: tgUser.last_name || "",
                    photoUrl: tgUser.photo_url || "",
                    lastActiveAt: new Date(),
                },
                $setOnInsert: {
                    referralCode: generateReferralCode(),
                },
            },
            {
                new: true,
                upsert: true,
            }
        );

        return res.status(200).json(user);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
}