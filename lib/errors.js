class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
  if (error.type === "entity.parse.failed") return res.status(400).json({ error: "Request body must be valid JSON." });
  if (error.type === "entity.too.large") return res.status(413).json({ error: "The request is too large." });
  if (error.code === 11000) return res.status(409).json({ error: "This record already exists. Please retry or use another email." });
  if (["ValidationError", "CastError"].includes(error.name)) return res.status(400).json({ error: "Some submitted details are invalid." });
  // Do not log bodies, tokens, connection strings, or database error payloads.
  console.error("Request failed", { method: req.method, path: req.path, type: error.name });
  return res.status(500).json({ error: "The server could not complete this request. Please try again." });
}
module.exports = { HttpError, errorHandler };
