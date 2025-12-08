const mongoose = require('mongoose');

async function connectDB() {
  try {
    await mongoose.connect(      
      "mongodb+srv://muskan4mann_db_user:muskan@cluster0.f2xqnke.mongodb.net/quizzoDB"
    );

    console.log("Connected to MongoDB Atlas");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}

module.exports = { connectDB };
