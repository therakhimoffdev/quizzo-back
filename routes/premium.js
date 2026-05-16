import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// Premium purchase (example with coins)
router.post('/purchase', async (req, res) => {
    try {
        const { telegramId, plan } = req.body; // plan: 'monthly' or 'yearly'
        if (!telegramId || !plan) return res.status(400).json({ error: 'Missing fields' });

        const user = await User.findOne({ telegramId });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const price = plan === 'monthly' ? 5000 : 12000; // tanga bilan
        if (user.coins < price) {
            return res.status(400).json({ error: 'Not enough coins' });
        }

        // Premium aktivatsiya
        user.coins -= price;
        user.isPremium = true;
        const expiresIn = plan === 'monthly' ? 30 : 365;
        user.premiumExpiresAt = new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000);
        await user.save();

        // Refererga commission (20%)
        if (user.referredBy) {
            const referrer = await User.findById(user.referredBy);
            if (referrer) {
                const commission = Math.floor(price * 0.2);
                referrer.coins += commission;
                referrer.referralEarnings += commission;
                await referrer.save();
            }
        }

        res.json({ success: true, user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Check premium status
router.get('/status/:telegramId', async (req, res) => {
    try {
        const { telegramId } = req.params;
        const user = await User.findOne({ telegramId });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isActive = user.isPremium && (!user.premiumExpiresAt || new Date(user.premiumExpiresAt) > new Date());
        res.json({
            isPremium: isActive,
            expiresAt: user.premiumExpiresAt
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;