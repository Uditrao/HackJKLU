import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Please define the MONGODB_URI environment variable inside .env.local");

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) return mongoose;
  return mongoose.connect(uri);
}

export default connectDB;
