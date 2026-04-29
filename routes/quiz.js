// routes/quiz.js

import express from "express";
import Quiz from "../models/Quiz.js";
import User from "../models/User.js";

const router = express.Router();

//
// 🔹 Helper: Level + Stage
//
const calculateLevel = (xp) => Math.floor(Math.sqrt(xp / 50)) + 1;
const calculateStage = (level) => Math.floor(level / 5) + 1;

//
// 🔹 Helper: Daily reset
//
const handleDailyReset = async (user) => {
    const today = new Date().toDateString();

    if (user.lastQuizDate?.toDateString() !== today) {
        user.dailyQuizCount = 0;
        user.lastQuizDate = new Date();
        await user.save();
    }
};

//
// 🔹 1. GET DAILY QUIZ
// GET /api/quiz/daily/:telegramId
//
router.get("/daily/:telegramId", async (req, res) => {
    try {
        const { telegramId } = req.params;

        const user = await User.findOne({ telegramId });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // 🔄 reset
        await handleDailyReset(user);

        const limit = user.isPremium ? 20 : 5;

        if (user.dailyQuizCount >= limit) {
            return res.json({
                locked: true,
                remaining: 0,
            });
        }

        // 🔥 Random quiz (correctAnswer yubormaymiz)
        const quizArr = await Quiz.aggregate([
            { $match: { isActive: true } },
            { $sample: { size: 1 } },
            {
                $project: {
                    title: 1,
                    description: 1,
                    xpReward: 1,
                    coinReward: 1,
                    "questions.question": 1,
                    "questions.options": 1,
                },
            },
        ]);

        if (!quizArr.length) {
            return res.status(404).json({ message: "Quiz not found" });
        }

        res.json({
            locked: false,
            quiz: quizArr[0],
            remaining: limit - user.dailyQuizCount,
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

//
// 🔹 2. SUBMIT QUIZ
// POST /api/quiz/submit
//
router.post("/submit", async (req, res) => {
    try {
        const { telegramId, quizId, answers } = req.body;

        if (!telegramId || !quizId || !answers) {
            return res.status(400).json({ message: "Missing data" });
        }

        const user = await User.findOne({ telegramId });
        const quiz = await Quiz.findById(quizId);

        if (!user || !quiz) {
            return res.status(404).json({ message: "User or Quiz not found" });
        }

        // 🔄 reset
        const today = new Date().toDateString();
        if (user.lastQuizDate?.toDateString() !== today) {
            user.dailyQuizCount = 0;
            user.lastQuizDate = new Date();
        }

        const limit = user.isPremium ? 20 : 5;

        if (user.dailyQuizCount >= limit) {
            return res.status(403).json({ message: "Daily limit reached" });
        }

        // ✅ Score hisoblash
        let correct = 0;

        quiz.questions.forEach((q, i) => {
            if (answers[i] === q.correctAnswer) correct++;
        });

        const percent = correct / quiz.questions.length;

        const earnedXP = Math.round(quiz.xpReward * percent);
        const earnedCoins = Math.round((quiz.coinReward || 10) * percent);

        //
        // 🔥 USER UPDATE (bitta save bilan — fast)
        //
        user.xp += earnedXP;
        user.coins += earnedCoins;
        user.totalQuizzes += 1;
        user.correctAnswers += correct;
        user.dailyQuizCount += 1;
        user.lastQuizDate = new Date();

        //
        // 🔥 LEVEL + STAGE
        //
        user.level = calculateLevel(user.xp);
        user.stage = calculateStage(user.level);

        //
        // 🔥 STREAK SYSTEM
        //
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const lastLogin = user.lastLoginDate?.toDateString();

        if (lastLogin === yesterday.toDateString()) {
            user.streak += 1;
        } else if (lastLogin !== today) {
            user.streak = 1;
        }

        user.lastLoginDate = new Date();

        if (user.streak > user.maxStreak) {
            user.maxStreak = user.streak;
        }

        //
        // 💾 SAVE
        //
        await user.save();

        res.json({
            success: true,
            correct,
            total: quiz.questions.length,
            earnedXP,
            earnedCoins,
            level: user.level,
            stage: user.stage,
            streak: user.streak,
            dailyQuizCount: user.dailyQuizCount,
        });

    } catch (err) {
        console.error("❌ SUBMIT ERROR:", err.message);
        res.status(500).json({ message: err.message });
    }
});

export default router;