//C:\Users\HP\dereeves\backend\src\controllers\messagecontroller.js
import Message from "../models/message.js";
import User from "../models/user.js";

// Get messages between current user and another user
export const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId }
      ]
    })
    .sort({ createdAt: 1 })
    .populate('sender', 'name email')
    .populate('receiver', 'name email');

    // Mark messages as read (messages sent TO current user FROM the other user)
    await Message.updateMany(
      {
        sender: userId,
        receiver: currentUserId,
        read: false
      },
      { $set: { read: true } }
    );

    res.status(200).json(messages);
  } catch (error) {
    console.error("❌ Get messages error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Send a new message
export const sendMessage = async (req, res) => {
  try {
    const { sender, receiver, content } = req.body;

    // Validation
    if (!sender || !receiver || !content) {
      return res.status(400).json({ 
        message: "Missing required fields",
        required: { sender, receiver, content }
      });
    }

    // Verify users exist
    const [senderExists, receiverExists] = await Promise.all([
      User.findById(sender),
      User.findById(receiver)
    ]);

    if (!senderExists || !receiverExists) {
      return res.status(404).json({ message: "Sender or receiver not found" });
    }

    const message = new Message({ sender, receiver, content, read: false });
    await message.save();

    // Populate sender and receiver info
    await message.populate('sender', 'name email');
    await message.populate('receiver', 'name email');

    res.status(201).json(message);
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all admin users (for regular users to fetch admin IDs)
export const getAdmin = async (req, res) => {
  try {
    console.log("📥 Received GET /messages/admin/info request from:", req.user?.email || "unknown user");

    const admins = await User.find({ role: "admin" }).select("-password");
    
    if (!admins || admins.length === 0) {
      return res.status(404).json({ message: "No admins found" });
    }

    res.status(200).json(admins);
  } catch (error) {
    console.error("Get admins error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get unread message counts for all conversations
export const getUnreadCounts = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Aggregate unread messages by sender
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          receiver: currentUserId,
          read: false
        }
      },
      {
        $group: {
          _id: "$sender",
          count: { $sum: 1 }
        }
      }
    ]);

    // Convert to object format { userId: count }
    const countsMap = {};
    unreadCounts.forEach(item => {
      countsMap[item._id.toString()] = item.count;
    });

    res.status(200).json(countsMap);
  } catch (error) {
    console.error("Get unread counts error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};