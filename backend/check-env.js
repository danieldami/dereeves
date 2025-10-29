// Check environment variables
import dotenv from "dotenv";

dotenv.config();

console.log("🔍 Environment Variables Check:");
console.log("MONGO_URI:", process.env.MONGO_URI ? "✅ Set" : "❌ Missing");
console.log("JWT_SECRET:", process.env.JWT_SECRET ? "✅ Set" : "❌ Missing");
console.log("PORT:", process.env.PORT || "5000 (default)");

if (!process.env.MONGO_URI) {
  console.log("❌ MONGO_URI is required");
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.log("❌ JWT_SECRET is required");
  process.exit(1);
}

console.log("✅ All required environment variables are set");

