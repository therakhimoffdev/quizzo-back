import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// GET /api/referral/stats/:telegramId
router.get('/stats/:telegramId', async (req, res) => {
    try {
        const { telegramId } = req.params;
        const user = await User.findOne({ telegramId }).populate('referredBy', 'firstName username');
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Taklif qilingan foydalanuvchilar ro‘yxati
        const referredUsers = await User.find({ referredBy: user._id }, 'firstName username createdAt').sort({ createdAt: -1 }).limit(20);

        res.json({
            referralCode: user.referralCode,
            referralsCount: user.referralsCount,
            referralEarnings: user.referralEarnings,
            referredBy: user.referredBy ? {
                firstName: user.referredBy.firstName,
                username: user.referredBy.username
            } : null,
            referredUsers: referredUsers.map(u => ({
                firstName: u.firstName,
                username: u.username,
                joinedAt: u.createdAt
            }))
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;