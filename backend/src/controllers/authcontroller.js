//C:\Users\HP\dereeves\backend\src\controllers\authcontroller.js
import User from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendVerificationEmail } from "../utils/emailService.js";
import crypto from "crypto";



// REGISTER USER
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Enhanced validation
    if (!name || !email || !password) {
      return res.status(400).json({ 
        message: "All fields are required",
        required: ["name", "email", "password"]
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        message: "Password must be at least 6 characters long" 
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create new user — model will hash password automatically
    const newUser = new User({ name, email, password });
    
    // Generate email verification token
    const verificationToken = newUser.getEmailVerificationToken();
    await newUser.save({ validateBeforeSave: false });

    try {
      // Send verification email
      await sendVerificationEmail(email, name, verificationToken);
      
      console.log(`✅ New user registered: ${email} - Verification email sent`);
      res.status(201).json({ 
        message: "Registration successful! Please check your email to verify your account.",
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
        }
      });
    } catch (emailError) {
      // If email fails, still save user but log the error
      console.error("❌ Failed to send verification email:", emailError);
      // Optionally, you could delete the user here if email is critical
      // For now, we'll keep the user and they can request a resend later
      res.status(201).json({ 
        message: "Registration successful! However, we couldn't send the verification email. Please contact support.",
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
        }
      });
    }
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// LOGIN USER
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log("🟢 Login attempt:", email);
        console.log("🔍 Email type:", typeof email);
        console.log("🔍 Email length:", email?.length);
        console.log("🔍 Email bytes:", Buffer.from(email || '').toString('hex'));

        // 🚀 CORRECTION: Check for missing email or password and return 400
        if (!email || !password) {
            console.log("❌ Missing email or password");
            return res.status(400).json({ message: "Please enter both email and password" });
        }
        // END CORRECTION

        console.log("🔍 Searching for user with email:", email);
        const user = await User.findOne({ email });
        console.log("🔍 Query result:", user ? "User found" : "User NOT found");
        
        // Also try searching all users to debug
        const allUsers = await User.find({}).select('email').limit(5);
        console.log("🔍 Sample users in DB:", allUsers.map(u => u.email));
        
        if (!user) {
            console.log("❌ No user found");
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log("❌ Password mismatch");
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Check if email is verified
        if (!user.isEmailVerified) {
            console.log("❌ Email not verified");
            return res.status(403).json({ message: "Please verify your email before logging in. Check your inbox for the verification link." });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "1d",
        });

        console.log("✅ Login successful");
        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        // This catch block handles internal server errors (like database connection issues)
        console.error("❌ Login Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// VERIFY EMAIL
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ message: "Verification token is required" });
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find user with this token and check if it's not expired
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ 
        message: "Invalid or expired verification token" 
      });
    }

    // Mark email as verified and clear token
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });

    console.log(`✅ Email verified for: ${user.email}`);
    res.status(200).json({ 
      message: "Email verified successfully! You can now log in." 
    });
  } catch (error) {
    console.error("❌ Email verification error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//get me
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error" });
  }
};
