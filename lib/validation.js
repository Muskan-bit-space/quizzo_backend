const { HttpError } = require("./errors");
const objectId = value => typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value);
function requireId(value) {
  if (!objectId(value)) throw new HttpError(400, "Invalid record identifier.");
  return value;
}
function bodyObject(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "Send a JSON object.");
  return body;
}
function requiredString(value, label, max) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new HttpError(400, `${label} is required and must be at most ${max} characters.`);
  return value.trim();
}
function emailValue(value) {
  const email = requiredString(value, "Email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Enter a valid email address.");
  return email;
}
function passwordValue(value, signup = false) {
  if (typeof value !== "string" || value.length < (signup ? 8 : 1) || value.length > 128) throw new HttpError(400, signup ? "Use a password between 8 and 128 characters." : "Enter your password.");
  return value;
}
function requestKey(req) {
  const key = req.get("Idempotency-Key");
  if (!key || !/^[A-Za-z0-9._:-]{1,128}$/.test(key)) throw new HttpError(400, "A valid Idempotency-Key header is required.");
  return key;
}
function quizInput(body) {
  bodyObject(body);
  const title = requiredString(body.title, "Title", 150);
  const description = body.description ?? "";
  if (typeof description !== "string" || description.length > 2000) throw new HttpError(400, "Description must be at most 2,000 characters.");
  if (!Array.isArray(body.questions) || body.questions.length < 1 || body.questions.length > 200) throw new HttpError(400, "Add between 1 and 200 questions.");
  const questions = body.questions.map((question, index) => {
    bodyObject(question);
    const text = requiredString(question.text, `Question ${index + 1}`, 2000);
    if (!Array.isArray(question.options) || question.options.length < 2 || question.options.length > 10) throw new HttpError(400, `Question ${index + 1} needs 2–10 options.`);
    const options = question.options.map(option => requiredString(option, "Answer option", 500));
    if (new Set(options.map(option => option.toLowerCase())).size !== options.length) throw new HttpError(400, `Question ${index + 1} contains duplicate options.`);
    const correctOption = question.correctOption;
    if (!Number.isInteger(correctOption) || correctOption < 0 || correctOption >= options.length) throw new HttpError(400, `Question ${index + 1} needs one valid correct answer.`);
    return { text, options, correctOption };
  });
  return { title, description: description.trim(), questions };
}
function gradeAnswers(snapshot, body) {
  bodyObject(body);
  if (!Array.isArray(body.answers) || body.answers.length !== snapshot.length) throw new HttpError(400, "Answer every question exactly once.");
  const selections = new Map();
  for (const answer of body.answers) {
    bodyObject(answer);
    requireId(answer.questionId);
    const id = answer.questionId.toLowerCase();
    if (selections.has(id) || !Number.isInteger(answer.optionIndex)) throw new HttpError(400, "Answers contain a duplicate question or invalid choice.");
    selections.set(id, answer.optionIndex);
  }
  let score = 0;
  const answers = snapshot.map(question => {
    const id = String(question._id);
    const optionIndex = selections.get(id);
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= question.options.length) throw new HttpError(400, "Answers contain a missing question or invalid choice.");
    if (question.correctOption === optionIndex) score++;
    return { questionId: id, optionIndex };
  });
  return { answers, result: { score, totalQuestions: snapshot.length, percentage: Math.round(score / snapshot.length * 100) } };
}
module.exports = { objectId, requireId, bodyObject, requiredString, emailValue, passwordValue, requestKey, quizInput, gradeAnswers };
