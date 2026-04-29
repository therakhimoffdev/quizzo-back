// models/Quiz.js
import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
    question: String,
    options: [String],
    correctAnswer: Number,
});

const quizSchema = new mongoose.Schema({
    title: String,
    description: String,
    xpReward: Number,
    coinReward: Number,
    questions: [questionSchema],
    isActive: { type: Boolean, default: true },
});

export default mongoose.model("Quiz", quizSchema);