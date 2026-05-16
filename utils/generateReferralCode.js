export const generateReferralCode = (telegramId) => {
    return Buffer.from(`ref_${telegramId}_${Date.now()}`).toString('base64').slice(0, 12);
};