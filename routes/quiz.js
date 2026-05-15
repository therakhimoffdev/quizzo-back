import express from 'express';
import Quiz from '../models/Quiz.js';
import UserDailyQuiz from '../models/UserDailyQuiz.js';
import User from '../models/User.js'; // ✅ QO‘SHILDI

const router = express.Router();

// GET /api/quiz/daily?userId=telegramId
router.get('/daily', async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }

        // user topamiz
        const user = await User.findOne({ telegramId: userId });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // user ishlagan quizlar
        const completedQuizIds = user.completedQuizIds || [];

        // ishlanmagan quizlarni topamiz
        const availableQuizzes = await Quiz.find({
            isActive: true,
            _id: { $nin: completedQuizIds }
        });

        if (availableQuizzes.length === 0) {
            return res.json({ quizzes: [] });
        }

        // random aralashtirish
        const shuffled = [...availableQuizzes];

        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));

            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // faqat 5 tasi
        const selectedQuizzes = shuffled.slice(0, 5);

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const quizzes = selectedQuizzes.map((quiz) => ({
            _id: quiz._id,
            title: quiz.title,
            description: quiz.description,
            xpReward: quiz.xpReward,
            coinReward: quiz.coinReward,
            questions: quiz.questions,
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

// POST /api/quiz/complete
router.post('/complete', async (req, res) => {
    try {
        const { userId, quizId, score, total, xpEarned, coinEarned } = req.body;

        if (!userId || !quizId) {
            return res.status(400).json({ error: 'Missing fields' });
        }

        // User topamiz
        const user = await User.findOne({ telegramId: userId });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Quiz oldin ishlanganmi tekshiramiz
        const alreadyCompleted = user.completedQuizIds.some(
            id => id.toString() === quizId.toString()
        );

        // Agar hali ishlanmagan bo‘lsa
        if (!alreadyCompleted) {

            // completed history ga qo‘shamiz
            user.completedQuizIds.push(quizId);

            // ✅ USER STATISTIKASI
            user.totalQuizzes += 1;
            user.correctAnswers += score;
            user.xp += xpEarned;
            user.coins += coinEarned;
            user.dailyQuizCount += 1;

            // Competition points
            user.competitionPoints += score * 10;

            // Level system
            const newLevel = Math.floor(user.xp / 500) + 1;

            if (newLevel > user.level) {
                user.level = newLevel;
            }

            // ===== STREAK SYSTEM =====
            const todayDate = new Date();

            const last = user.lastQuizDate
                ? new Date(user.lastQuizDate)
                : null;

            if (last) {

                // Sana farqini hisoblaymiz
                const diffDays = Math.floor(
                    (todayDate.setHours(0, 0, 0, 0) - last.setHours(0, 0, 0, 0))
                    / 86400000
                );

                if (diffDays === 1) {
                    // ketma-ket kun
                    user.streak += 1;

                } else if (diffDays > 1) {
                    // streak reset
                    user.streak = 1;
                }

            } else {
                // birinchi quiz
                user.streak = 1;
            }

            // max streak
            if (user.streak > user.maxStreak) {
                user.maxStreak = user.streak;
            }

            user.lastQuizDate = new Date();
            user.lastActiveAt = new Date();

            await user.save();
        }

        res.json({
            success: true,
            user
        });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            error: 'Server error'
        });
    }
});
export default router;