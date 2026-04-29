// utils/progression.js

export const calculateLevel = (xp) => {
    return Math.floor(Math.sqrt(xp / 50)) + 1;
};

export const calculateStage = (level) => {
    return Math.floor(level / 5) + 1;
};