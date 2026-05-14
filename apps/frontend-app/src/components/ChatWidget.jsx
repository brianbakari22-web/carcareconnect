import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';

const ChatWidget = ({ userId, userName, userRole, bookingId, customerId, providerId, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  const { 
    isConnected,
    sendChatMessage,
    onNewMessage,
    onTypingStart,
    onTypingStop,
    joinBookingRoom
  } = useSocket();
  
  useEffect(() => {
    if (bookingId) {
      joinBookingRoom(bookingId);
    }
    
    const unsubscribeMessage = onNewMessage((data) => {
      if (data.from !== userId) {
        setMessages(prev => [...prev, {
          id: data.id,
          from: data.from,
          message: data.message,
          timestamp: data.timestamp,
          isOwn: false
        }]);
        scrollToBottom();
      }
    });
    
    const unsubscribeTypingStart = onTypingStart((data) => {
      if (data.fromUserId !== userId) {
        setTypingUser(data.fromName || 'Someone');
        setTimeout(() => setTypingUser(null), 2000);
      }
    });
    
    const unsubscribeTypingStop = onTypingStop((data) => {
      if (data.fromUserId !== userId) {
        setTypingUser(null);
      }
    });
    
    return () => {
      if (unsubscribeMessage) unsubscribeMessage();
      if (unsubscribeTypingStart) unsubscribeTypingStart();
      if (unsubscribeTypingStop) unsubscribeTypingStop();
    };
  }, [bookingId, userId]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    
    const targetId = userRole === 'customer' ? providerId : (userRole === 'provider' ? customerId : null);
    if (!targetId) return;
    
    sendChatMessage(targetId, inputMessage, bookingId);
    setMessages(prev => [...prev, {
      id: Date.now(),
      from: userId,
      message: inputMessage,
      timestamp: new Date(),
      isOwn: true
    }]);
    setInputMessage('');
    scrollToBottom();
  };
  
  const handleTyping = (e) => {
    setInputMessage(e.target.value);
    const targetId = userRole === 'customer' ? providerId : (userRole === 'provider' ? customerId : null);
    
    if (!isTyping && e.target.value.length > 0 && targetId) {
      setIsTyping(true);
      onTypingStart(targetId, bookingId);
    }
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping && targetId) {
        setIsTyping(false);
        onTypingStop(targetId, bookingId);
      }
    }, 1000);
  };
  
  return (
    <div style={styles.chatContainer}>
      <div style={styles.chatHeader}>
        <div>
          <span>💬 Chat with {userRole === 'customer' ? 'Provider' : 'Customer'}</span>
          {isConnected && <span style={styles.onlineDot}></span>}
        </div>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>
      </div>
      
      <div style={styles.messagesArea}>
        {messages.length === 0 ? (
          <div style={styles.emptyChat}>No messages yet. Start a conversation!</div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} style={{ ...styles.message, justifyContent: msg.isOwn ? 'flex-end' : 'flex-start' }}>
              <div style={{ ...styles.messageBubble, backgroundColor: msg.isOwn ? '#8b5cf6' : '#f3f4f6', color: msg.isOwn ? 'white' : '#374151' }}>
                <div style={styles.messageText}>{msg.message}</div>
                <div style={styles.messageTime}>{new Date(msg.timestamp).toLocaleTimeString()}</div>
              </div>
            </div>
          ))
        )}
        {typingUser && (
          <div style={styles.typingIndicator}>
            <span>{typingUser} is typing...</span>
            <span style={styles.typingDots}>...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div style={styles.inputArea}>
        <input
          type="text"
          value={inputMessage}
          onChange={handleTyping}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type a message..."
          style={styles.chatInput}
        />
        <button onClick={handleSendMessage} style={styles.sendBtn}>Send</button>
      </div>
    </div>
  );
};

const styles = {
  chatContainer: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '350px',
    height: '450px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000,
    overflow: 'hidden'
  },
  chatHeader: {
    padding: '15px',
    backgroundColor: '#8b5cf6',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontWeight: 'bold'
  },
  onlineDot: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    backgroundColor: '#10b981',
    borderRadius: '50%',
    marginLeft: '8px'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '18px',
    cursor: 'pointer'
  },
  messagesArea: {
    flex: 1,
    padding: '15px',
    overflowY: 'auto',
    backgroundColor: '#f9fafb'
  },
  message: {
    display: 'flex',
    marginBottom: '10px'
  },
  messageBubble: {
    maxWidth: '70%',
    padding: '8px 12px',
    borderRadius: '12px',
    wordWrap: 'break-word'
  },
  messageText: {
    fontSize: '13px'
  },
  messageTime: {
    fontSize: '9px',
    marginTop: '4px',
    opacity: 0.7
  },
  emptyChat: {
    textAlign: 'center',
    color: '#9ca3af',
    padding: '40px'
  },
  typingIndicator: {
    padding: '8px',
    fontSize: '11px',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  typingDots: {
    animation: 'pulse 1s infinite'
  },
  inputArea: {
    padding: '10px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    gap: '10px',
    backgroundColor: 'white'
  },
  chatInput: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '20px',
    outline: 'none'
  },
  sendBtn: {
    backgroundColor: '#8b5cf6',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '20px',
    cursor: 'pointer'
  }
};

export default ChatWidget;
