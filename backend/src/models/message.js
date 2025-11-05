//C:\Users\HP\dereeves\backend\src\models\message.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    receiver: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    content: { 
      type: String, 
      required: false  // Not required anymore since messages can be file-only
    },
    read: {
      type: Boolean,
      default: false
    },
    // File attachment fields
    fileUrl: {
      type: String,
      required: false
    },
    fileName: {
      type: String,
      required: false
    },
    fileType: {
      type: String,
      required: false
    },
    fileSize: {
      type: Number,
      required: false
    }
  },
  { timestamps: true }
);

// Index for faster queries
messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);
export default Message;