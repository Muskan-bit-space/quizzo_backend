function userName(user) {
  return user?.name || user?.email?.split("@")[0] || "Quiz creator";
}
function publicUser(user) {
  return { id: String(user._id), name: userName(user), email: user.email };
}
function publicQuestion(question) {
  return { id: String(question._id), text: question.text, options: [...question.options] };
}
function quizSummary(quiz, owner, stats = {}) {
  return {
    id: String(quiz._id), title: quiz.title, description: quiz.description || "",
    shareId: quiz.shareId, ownerName: userName(owner), questionCount: quiz.questions.length,
    createdAt: quiz.createdAt, updatedAt: quiz.updatedAt,
    attemptCount: stats.count || 0, averageScore: stats.average == null ? null : Math.round(stats.average),
  };
}
function publicAttempt(attempt) {
  const payload = {
    id: String(attempt._id), quizId: String(attempt.quizId), quizTitle: attempt.quizTitle,
    shareId: attempt.shareId, participantName: attempt.participantName,
    status: attempt.status, totalQuestions: attempt.snapshot.length,
    startedAt: attempt.startedAt,
    questions: attempt.snapshot.map(publicQuestion),
    answers: attempt.answers.map(answer => ({ questionId: String(answer.questionId), optionIndex: answer.optionIndex })),
  };
  if (attempt.status === "submitted") {
    payload.completedAt = attempt.completedAt;
    payload.result = { score: attempt.result.score, totalQuestions: attempt.result.totalQuestions, percentage: attempt.result.percentage };
  }
  return payload;
}
module.exports = { userName, publicUser, publicQuestion, quizSummary, publicAttempt };
