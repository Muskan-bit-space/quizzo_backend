const { randomBytes, scrypt, timingSafeEqual, createHash } = require("node:crypto");
const { promisify } = require("node:util");
const derive = promisify(scrypt);
const options = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt, 64, options);
  return `scrypt$v1$${salt}$${key.toString("hex")}`;
}
async function verifyPassword(password, encoded) {
  if (typeof encoded !== "string") return false;
  const match = encoded.match(/^scrypt\$v1\$([a-f0-9]{32})\$([a-f0-9]{128})$/);
  if (!match) return false;
  const actual = await derive(password, match[1], 64, options);
  return timingSafeEqual(actual, Buffer.from(match[2], "hex"));
}
function verifyLegacyPassword(password, stored) {
  if (typeof stored !== "string") return false;
  const digest = value => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(password), digest(stored));
}
module.exports = { hashPassword, verifyPassword, verifyLegacyPassword };
