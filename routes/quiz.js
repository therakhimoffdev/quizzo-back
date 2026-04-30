import express from 'express';
import Quiz from '../models/Quiz.js';
import UserDailyQuiz from '../models/UserDailyQuiz.js';
import User from '../models/User.js'; // ✅ QO‘SHILDI

const router = express.Router();

// GET /api/quiz/daily?userId=telegramId
router.get('/daily', async (req, res) => {
    try {
        const { userId } = req.query; // userId = telegramId
        if (!userId) return res.status(400).json({ error: 'userId required' });

        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

        // User ni _id bo‘yicha topamiz (telegramId orqali)
        const user = await User.findOne({ telegramId: userId });
        if (!user) return res.status(404).json({ error: 'User not found' });

        let dailyRecord = await UserDailyQuiz.findOne({ userId: user._id, date: today })
            .populate('quizIds'); // to‘liq quiz ma’lumotlari (questions bilan)

        if (!dailyRecord) {
            // 5 ta random quiz tanlaymiz
            const allQuizzes = await Quiz.find({ isActive: true });
            if (allQuizzes.length === 0) return res.json({ quizzes: [] });

            const shuffled = [...allQuizzes];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            const selectedQuizzes = shuffled.slice(0, 5);

            dailyRecord = new UserDailyQuiz({
                userId: user._id,
                date: today,
                quizIds: selectedQuizzes.map(q => q._id),
                completedQuizzes: [],
            });
            await dailyRecord.save();
            await dailyRecord.populate('quizIds');
        }

        // “Yangi” quizlarni aniqlash (masalan, so‘nggi 24 soatda yaratilgan)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const quizzesWithStatus = dailyRecord.quizIds.map(quiz => ({
            _id: quiz._id,
            title: quiz.title,
            description: quiz.description,
            xpReward: quiz.xpReward,
            coinReward: quiz.coinReward,
            questions: quiz.questions, // ✅ To‘liq savollar
            questionCount: quiz.questions.length,
            completed: dailyRecord.completedQuizzes.includes(quiz._id),
            isNew: quiz.createdAt >= yesterday, // agar createdAt maydoni bo‘lsa
        }));

        res.json({ quizzes: quizzesWithStatus });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/quiz/complete
router.post('/complete', async (req, res) => {
    try {
        const { userId, quizId, score, total, xpEarned, coinEarned } = req.body;
        if (!userId || !quizId) return res.status(400).json({ error: 'Missing fields' });

        const user = await User.findOne({ telegramId: userId });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const today = new Date().toISOString().slice(0, 10);
        const dailyRecord = await UserDailyQuiz.findOne({ userId: user._id, date: today });
        if (!dailyRecord) return res.status(404).json({ error: 'No daily record found' });

        // Agar quiz allaqachon bajarilgan bo‘lsa, qayta qo‘shmaymiz
        if (!dailyRecord.completedQuizzes.includes(quizId)) {
            dailyRecord.completedQuizzes.push(quizId);
            await dailyRecord.save();

            // ✅ USER STATISTIKASINI YANGILASH
            user.totalQuizzes += 1;
            user.correctAnswers += score;
            user.xp += xpEarned;
            user.coins += coinEarned;
            user.dailyQuizCount += 1;
            user.lastQuizDate = new Date();

            // Competition points (masalan, har bir to‘g‘ri javob uchun 10 ball)
            user.competitionPoints += score * 10;

            // Levelni hisoblash: har 500 XP da 1 level
            const newLevel = Math.floor(user.xp / 500) + 1;
            if (newLevel > user.level) user.level = newLevel;

            // Streak
            const last = user.lastQuizDate ? new Date(user.lastQuizDate) : null;
            const todayDate = new Date();
            if (last && last.toDateString() === todayDate.toDateString()) {
                // bugun allaqachon test topshirgan – streak oshmaydi
            } else if (last && (todayDate - last) <= 86400000 * 2) {
                user.streak += 1;
                if (user.streak > user.maxStreak) user.maxStreak = user.streak;
            } else {
                user.streak = 1;
            }
            user.lastQuizDate = todayDate;
            user.lastActiveAt = todayDate;

            await user.save();
        }

        res.json({ success: true, user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;