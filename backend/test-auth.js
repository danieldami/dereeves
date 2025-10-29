// Simple test script to check authentication
import mongoose from "mongoose";
import User from "./src/models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const testAuth = async () => {
  try {
    console.log("🔌 Connecting to database...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Database connected");

    // Check if admin user exists
    let admin = await User.findOne({ role: "admin" });
    if (!admin) {
      console.log("👤 Creating admin user...");
      admin = new User({
        name: "Admin User",
        email: "admin@test.com",
        password: "password123",
        role: "admin"
      });
      await admin.save();
      console.log("✅ Admin user created");
    } else {
      console.log("✅ Admin user exists:", admin.email);
    }

    // Check if test user exists
    let testUser = await User.findOne({ email: "user@test.com" });
    if (!testUser) {
      console.log("👤 Creating test user...");
      testUser = new User({
        name: "Test User",
        email: "user@test.com",
        password: "password123",
        role: "user"
      });
      await testUser.save();
      console.log("✅ Test user created");
    } else {
      console.log("✅ Test user exists:", testUser.email);
    }

    // Test login
    console.log("🔑 Testing login...");
    const loginUser = await User.findOne({ email: "user@test.com" });
    const isMatch = await bcrypt.compare("password123", loginUser.password);
    console.log("🔑 Password match:", isMatch);

    if (isMatch) {
      const token = jwt.sign({ id: loginUser._id }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });
      console.log("✅ Token generated:", token.substring(0, 20) + "...");
    }

    console.log("🎉 Authentication test completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
};

testAuth();

