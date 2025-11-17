//C:\Users\HP\dereeves\frontend\src\components\incomingcallmodal.js
"use client";

export default function IncomingCallModal({ caller, callType, onAccept, onReject }) {
  if (!caller) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
        <div className="text-6xl mb-4">
          {callType === "video" ? "📹" : "📞"}
        </div>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Incoming {callType === "video" ? "Video" : "Audio"} Call
        </h2>
        
        <p className="text-gray-600 mb-2">{caller.name}</p>
        

        <div className="flex gap-4">
          <button
            onClick={onReject}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold"
          >
            Reject
          </button>
          
          <button
            onClick={onAccept}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}