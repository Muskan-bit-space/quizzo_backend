const mongoose = require('mongoose');
require('dotenv').config();

async function connectDB() {
  try {
    
    mongoose.connection.once("open", () => {
      console.log("Connected to:", mongoose.connection.host);
      console.log("DB Name:", mongoose.connection.name);

    });
    await mongoose.connect(      
      process.env.MONGOURL  // is  wlae se connect hua h
    );

    // console.log("Connected to MongoDB Atlas");

  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}

module.exports = { connectDB };
