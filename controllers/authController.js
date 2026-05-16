// controllers/authController.js
import User from "../models/User.js";
import { verifyTelegram } from "../utils/verifyTelegram.js";

// Unikal referral kod generatsiyasi (telegramId + timestamp)
function generateReferralCode(telegramId) {
    return Buffer.from(`ref_${telegramId}_${Date.now()}`).toString('base64').slice(0, 12);
}

export const telegramAuth = async (req, res) => {
    console.log("=================================");
    console.log("🔐 TELEGRAM AUTH STARTED");
    console.log("📦 BODY:", JSON.stringify(req.body));
    console.log("=================================");

    try {
        const { initDataRaw, referralCode } = req.body;

        if (!initDataRaw) {
            console.log("❌ initDataRaw YO'Q");
            return res.status(400).json({
                success: false,
                message: "initDataRaw required",
            });
        }

        // ✅ Telegram ma'lumotlarini tekshirish (xavfsizlik)
        const botToken = process.env.BOT_TOKEN;
        if (!botToken) {
            console.error("❌ BOT_TOKEN env da topilmadi");
            return res.status(500).json({ success: false, message: "Server configuration error" });
        }

        const isValid = verifyTelegram(initDataRaw, botToken);
        if (!isValid) {
            console.warn("⚠️ Yaroqsiz Telegram initData");
            return res.status(401).json({
                success: false,
                message: "Invalid Telegram data",
            });
        }

        // Foydalanuvchi ma'lumotlarini parse qilish
        const params = new URLSearchParams(initDataRaw);
        const userStr = params.get("user");
        if (!userStr) {
            console.log("❌ 'user' parametri topilmadi");
            return res.status(400).json({
                success: false,
                message: "Telegram user data not found",
            });
        }

        const tgUser = JSON.parse(userStr);
        const telegramId = tgUser.id.toString();

        console.log("👤 Telegram user:", telegramId, tgUser.first_name);

        // Foydalanuvchini qidirish
        let user = await User.findOne({ telegramId });

        if (!user) {
            // ---------- YANGI FOYDALANUVCHI ----------
            console.log("🆕 Yangi foydalanuvchi yaratilmoqda...");

            let referrer = null;
            if (referralCode) {
                console.log(`🔗 Referral kod berilgan: ${referralCode}`);
                referrer = await User.findOne({ referralCode });
                if (referrer && referrer.telegramId === telegramId) {
                    console.warn("⚠️ Self-referral detected, ignoring");
                    referrer = null;
                }
                if (referrer) {
                    console.log(`✅ Referrer topildi: ${referrer._id} (${referrer.firstName})`);
                } else {
                    console.warn("⚠️ Referral kod topilmadi yoki noto‘g‘ri");
                }
            }

            const newReferralCode = generateReferralCode(telegramId);
            user = new User({
                telegramId,
                username: tgUser.username || "",
                firstName: tgUser.first_name || "",
                lastName: tgUser.last_name || "",
                photoUrl: tgUser.photo_url || "",
                referralCode: newReferralCode,
                referredBy: referrer?._id || null,
                lastActiveAt: new Date(),
            });

            await user.save();
            console.log(`✅ Yangi user saqlandi. ID: ${user._id}, Referral kodi: ${newReferralCode}`);

            if (referrer) {
                await User.findByIdAndUpdate(referrer._id, { $inc: { referralsCount: 1 } });
                console.log(`📈 Referrer (${referrer._id}) referralsCount +1`);
            }
        } else {
            // ---------- MAVJUD FOYDALANUVCHI ----------
            console.log("♻️ Mavjud foydalanuvchi yangilanmoqda...");
            user.username = tgUser.username || user.username;
            user.firstName = tgUser.first_name || user.firstName;
            user.lastName = tgUser.last_name || user.lastName;
            user.photoUrl = tgUser.photo_url || user.photoUrl;
            user.lastActiveAt = new Date();

            if (!user.referralCode) {
                user.referralCode = generateReferralCode(telegramId);
                console.log(`🔑 Eski foydalanuvchiga yangi referralCode berildi: ${user.referralCode}`);
            }

            await user.save();
            console.log(`✅ Mavjud user yangilandi. ID: ${user._id}`);
        }

        console.log("=================================");
        return res.json({
            success: true,
            user: {
                telegramId: user.telegramId,
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                photoUrl: user.photoUrl,
                level: user.level,
                stage: user.stage,
                xp: user.xp,
                coins: user.coins,
                isPremium: user.isPremium,
                premiumExpiresAt: user.premiumExpiresAt,
                dailyQuizCount: user.dailyQuizCount,
                totalQuizzes: user.totalQuizzes,
                correctAnswers: user.correctAnswers,
                competitionPoints: user.competitionPoints,
                referralCode: user.referralCode,
                referralsCount: user.referralsCount,
                referralEarnings: user.referralEarnings,
                streak: user.streak,
                maxStreak: user.maxStreak,
                lastActiveAt: user.lastActiveAt,
            }
        });

    } catch (err) {
        console.error("❌ AUTH ERROR:", err.message);
        console.error("❌ STACK:", err.stack);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message,
        });
    }
};