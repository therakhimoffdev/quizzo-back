import express from 'express';
import Quiz from '../models/Quiz.js';
import User from '../models/User.js';

const router = express.Router();

// Kunlik testlar ro‘yxati (daily limit reset tekshiruvi bilan)
router.get('/daily', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: 'userId required' });

        const user = await User.findOne({ telegramId: userId });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Kunlik limitni reset qilish (agar oxirgi quiz boshqa kunda bo‘lsa)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastQuiz = user.lastQuizDate ? new Date(user.lastQuizDate) : null;
        if (lastQuiz && lastQuiz.setHours(0, 0, 0, 0) !== today.getTime()) {
            user.dailyQuizCount = 0;
            await user.save();
        }

        const completedQuizIds = user.completedQuizIds || [];
        const availableQuizzes = await Quiz.find({
            isActive: true,
            _id: { $nin: completedQuizIds }
        });

        if (availableQuizzes.length === 0) {
            return res.json({ quizzes: [] });
        }

        // Random 5 ta
        const shuffled = [...availableQuizzes];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const selectedQuizzes = shuffled.slice(0, 5);

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const quizzes = selectedQuizzes.map((quiz) => ({
            _id: quiz._id,
            title: quiz.title,
            description: quiz.description,
            xpReward: quiz.xpReward,
            coinReward: quiz.coinReward,
            questions: quiz.questions.map(q => ({
                question: q.question,
                options: q.options,
            })),
            questionCount: quiz.questions.length,
            completed: false,
            isNew: quiz.createdAt >= yesterday,
        }));
        res.json({ quizzes });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Quiz tugatish + referral bonus
router.post('/complete', async (req, res) => {
    try {
        const { userId, quizId, answers } = req.body;
        if (!userId || !quizId || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'userId, quizId and answers array required' });
        }

        const user = await User.findOne({ telegramId: userId });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

        const alreadyCompleted = user.completedQuizIds.some(id => id.toString() === quizId);
        if (alreadyCompleted) {
            return res.status(400).json({ error: 'Quiz already completed' });
        }

        // Daily limit
        const DAILY_LIMIT_NORMAL = 5;
        if (!user.isPremium && user.dailyQuizCount >= DAILY_LIMIT_NORMAL) {
            return res.status(429).json({ error: 'Daily quiz limit reached' });
        }

        // Hisoblash
        let correctCount = 0;
        quiz.questions.forEach((q, idx) => {
            const userAnswer = answers[idx];
            if (userAnswer !== undefined && userAnswer !== -1 && userAnswer === q.correctAnswer) {
                correctCount++;
            }
        });
        const total = quiz.questions.length;
        const ratio = correctCount / total;
        const xpEarned = Math.floor(quiz.xpReward * ratio);
        const coinEarned = Math.floor(quiz.coinReward * ratio);

        // User statistikasini yangilash
        user.completedQuizIds.push(quizId);
        user.totalQuizzes += 1;
        user.correctAnswers += correctCount;
        user.xp += xpEarned;
        user.coins += coinEarned;
        user.dailyQuizCount += 1;
        user.competitionPoints += correctCount * 10;

        // Level
        const newLevel = Math.floor(user.xp / 500) + 1;
        if (newLevel > user.level) user.level = newLevel;

        // Streak
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const last = user.lastQuizDate ? new Date(user.lastQuizDate) : null;
        if (last) {
            const lastDate = new Date(last);
            lastDate.setHours(0, 0, 0, 0);
            const diffDays = (today - lastDate) / 86400000;
            if (diffDays === 1) user.streak += 1;
            else if (diffDays > 1) user.streak = 1;
        } else {
            user.streak = 1;
        }
        if (user.streak > user.maxStreak) user.maxStreak = user.streak;
        user.lastQuizDate = new Date();
        user.lastActiveAt = new Date();

        await user.save();

        // ✅ Referral bonus (birinchi quiz tugatganda)
        if (!user.referredBonusGiven && user.referredBy) {
            const referrer = await User.findById(user.referredBy);
            if (referrer) {
                const BONUS_COINS = 50;
                const BONUS_XP = 25;
                referrer.coins += BONUS_COINS;
                referrer.xp += BONUS_XP;
                referrer.referralEarnings += BONUS_COINS;
                await referrer.save();

                user.referredBonusGiven = true;
                await user.save();
            }
        }

        res.json({
            success: true,
            user,
            correctCount,
            total,
            xpEarned,
            coinEarned
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;