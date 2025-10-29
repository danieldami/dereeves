"use client";
import { memo } from "react";

const Message = memo(({ message, isCurrentUser, currentUserId }) => {
  const msgSenderId = typeof message.sender === 'object' ? message.sender._id : message.sender;
  const isFromCurrentUser = msgSenderId === currentUserId;
  
  return (
    <div className={`flex ${isFromCurrentUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg shadow ${
          isFromCurrentUser
            ? "bg-blue-600 text-white"
            : "bg-white text-black"
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold opacity-75">
            {isFromCurrentUser ? "You" : "Admin"}
          </span>
        </div>
        <p className="break-words">{message.content}</p>
        <div className="flex items-center justify-between mt-1">
          <p className={`text-xs ${isFromCurrentUser ? "text-blue-100" : "text-gray-500"}`}>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          {isFromCurrentUser && (
            <span className="text-xs text-blue-100">
              {message.read ? "✓✓" : "✓"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

Message.displayName = 'Message';

export default Message;
