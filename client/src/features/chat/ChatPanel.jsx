import { useEffect, useRef, useState } from 'react';
import { X, Send } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../auth/authSlice';
import { useGetMessagesQuery, useSendMessageMutation } from '../customer/customerApi';
import { getSocket } from '../../socket/socketClient';
import { formatTime } from '../../utils/formatDate';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function ChatPanel({ orderId, riderName, recipientName, title, onClose }) {
  const displayName = recipientName || riderName;
  const headerTitle = title || 'Chat with Rider';
  const currentUser = useSelector(selectCurrentUser);
  const [text, setText] = useState('');
  const [localMessages, setLocalMessages] = useState([]);
  const bottomRef = useRef(null);

  const { data, isLoading } = useGetMessagesQuery(orderId, { skip: !orderId });
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();

  // Merge API messages + local real-time messages
  const apiMessages = data?.messages || [];
  const allMessages = [
    ...apiMessages,
    ...localMessages.filter((lm) => !apiMessages.find((am) => am._id === lm._id)),
  ].sort((a, b) => new Date(a.createdAt || a.timestamp) - new Date(b.createdAt || b.timestamp));

  // Listen for real-time messages
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = (msg) => {
      if (msg.orderId === orderId) {
        setLocalMessages((prev) => [...prev, msg]);
      }
    };
    socket.on('new_message', handler);
    return () => socket.off('new_message', handler);
  }, [orderId]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages.length]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    setText('');
    try {
      await sendMessage({ orderId, text: trimmed }).unwrap();
    } catch {}
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-0 right-0 md:right-6 md:bottom-6 w-full md:w-80 bg-white rounded-t-[12px] md:rounded-[12px] shadow-lg border border-[#E0E0E0] z-50 flex flex-col" style={{ maxHeight: 480, height: 480 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E0E0E0] bg-[#E23744] rounded-t-[12px] text-white">
        <div>
          <p className="text-sm font-semibold">{headerTitle}</p>
          {displayName && <p className="text-xs text-white/80">{displayName}</p>}
        </div>
        <button onClick={onClose} className="text-white/80 hover:text-white">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner size="md" /></div>
        ) : allMessages.length === 0 ? (
          <p className="text-center text-xs text-[#7E808C] py-8">No messages yet. Say hi!</p>
        ) : (
          allMessages.map((msg, i) => {
            const isMe = msg.senderId === currentUser?._id || msg.senderId?._id === currentUser?._id;
            return (
              <div key={msg._id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-[10px] px-3 py-2 text-sm ${
                    isMe
                      ? 'bg-[#E23744] text-white rounded-br-sm'
                      : 'bg-[#F1F1F6] text-[#1C1C1C] rounded-bl-sm'
                  }`}
                >
                  <p>{msg.text}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? 'text-white/70' : 'text-[#7E808C]'}`}>
                    {formatTime(msg.createdAt || msg.timestamp)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 p-3 border-t border-[#E0E0E0]">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          maxLength={500}
          className="flex-1 border border-[#E0E0E0] rounded-full px-4 py-2 text-sm focus:outline-none focus:border-[#E23744]"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || isSending}
          className="w-8 h-8 bg-[#E23744] text-white rounded-full flex items-center justify-center disabled:opacity-50 hover:bg-[#c42f3a] shrink-0"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
