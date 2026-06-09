const mongoose = require("mongoose");
const env = require("./env");

async function connectDatabase() {
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(env.mongoUri);
    console.log(`Connected to MongoDB (${env.mongoUri.includes('@') ? 'Atlas' : 'Local'})`);
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error.message);
    throw error;
  }
}

module.exports = connectDatabase;
