const mongoose = require('mongoose');
require('dotenv').config();

async function connectDB() {
  try {
    await mongoose.connect(      
      process.env.MONGOURL  // is  wlae se connect hua h
    );

    console.log("Connected to MongoDB Atlas");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}

module.exports = { connectDB };
