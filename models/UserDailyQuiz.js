import mongoose from "mongoose";

const userDailyQuizSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    quizIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Quiz" }],
    completedQuizzes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Quiz" }], // which quizzes the user completed that day
});

export default mongoose.model("UserDailyQuiz", userDailyQuizSchema);