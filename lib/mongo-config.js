const { MongoClient } = require("mongodb");

class ConfigError extends Error {
  constructor(message) { super(message); this.name = "ConfigError"; }
}

function validateMongoUrl(uri) {
  if (typeof uri !== "string" || !/^mongodb(?:\+srv)?:\/\//.test(uri)) {
    throw new ConfigError("MONGOURL must be a MongoDB connection string.");
  }
  let credentials;
  try {
    // Parsing constructs no connection and performs no DNS/network requests.
    credentials = new MongoClient(uri).options.credentials;
  } catch {
    throw new ConfigError("MONGOURL has invalid syntax. Check the Atlas connection string and URL-encode reserved characters in credentials.");
  }
  const template = /^<(?:db_)?(?:password|username)>$/i;
  if (template.test(credentials?.username || "") || template.test(credentials?.password || "")) {
    throw new ConfigError("MONGOURL still contains an Atlas username/password placeholder. Replace it with the database user's credentials, URL-encode reserved characters, and save .env.");
  }
  return uri;
}

module.exports = { validateMongoUrl, ConfigError };
