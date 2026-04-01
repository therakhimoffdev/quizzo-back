// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        telegramId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        username: String,
        firstName: String,
        lastName: String,
        photoUrl: String,

        level: { type: Number, default: 1 },
        stage: { type: Number, default: 1 },
        xp: { type: Number, default: 0 },

        coins: { type: Number, default: 0 },

        isPremium: { type: Boolean, default: false },
        premiumExpiresAt: Date,

        dailyQuizCount: { type: Number, default: 0 },
        lastQuizDate: Date,
        dailyAdWatchCount: { type: Number, default: 0 },

        totalQuizzes: { type: Number, default: 0 },
        correctAnswers: { type: Number, default: 0 },

        competitionPoints: { type: Number, default: 0 },

        referralCode: { type: String, unique: true },
        referralsCount: { type: Number, default: 0 },
        referralEarnings: { type: Number, default: 0 },

        streak: { type: Number, default: 0 },
        lastLoginDate: Date,
        maxStreak: { type: Number, default: 0 },

        lastActiveAt: Date,
    },
    { timestamps: true }
);

export default mongoose.model("User", userSchema);