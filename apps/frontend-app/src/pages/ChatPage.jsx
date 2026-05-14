import React, { useState, useEffect, useRef } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useSocket } from '../hooks/useSocket';

function ChatPage({ user, onClose }) {
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [inbox, setInbox] = useState([]);
  const [sentMessages, setSentMessages] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  const token = localStorage.getItem('token');
  
  const { 
    isConnected,
    sendChatMessage,
    onNewMessage,
    onTypingStart,
    onTypingStop
  } = useSocket();
  
  // Fetch inbox
  const fetchInbox = async () => {
    try {
      const res = await fetch('https://carcareconnect-backend.onrender.com/api/chat/inbox', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setInbox(data.inbox || []);
        const totalUnread = data.inbox.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
        setUnreadCount(totalUnread);
      }
    } catch (error) {
      console.error('Error fetching inbox:', error);
    }
  };
  
  // Fetch sent messages
  const fetchSentMessages = async () => {
    try {
      const res = await fetch('https://carcareconnect-backend.onrender.com/api/chat/sent', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSentMessages(data.sent || []);
      }
    } catch (error) {
      console.error('Error fetching sent messages:', error);
    }
  };
  
  // Fetch conversation with a user
  const fetchConversation = async (userId, userName, userRole, bookingId) => {
    setLoadingMessages(true);
    try {
      const url = `https://carcareconnect-backend.onrender.com/api/chat/conversation/${userId}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
        setSelectedConversation({ userId, userName, userRole, bookingId });
        scrollToBottom();
        fetchInbox(); // Refresh inbox to update unread counts
      }
    } catch (error) {
      console.error('Error fetching conversation:', error);
    } finally {
      setLoadingMessages(false);
    }
  };
  
  // Send message
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    if (!selectedConversation) return;
    
    const newMessage = {
      _id: Date.now(),
      from: { _id: user._id, firstName: user.firstName, lastName: user.lastName, role: user.role },
      to: { _id: selectedConversation.userId },
      message: inputMessage,
      createdAt: new Date(),
      isOwn: true
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    scrollToBottom();
    
    try {
      const res = await fetch('https://carcareconnect-backend.onrender.com/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          toUserId: selectedConversation.userId,
          message: inputMessage,
          bookingId: selectedConversation.bookingId
        })
      });
      const data = await res.json();
      if (!data.success) {
        toast.error('Failed to send message');
      }
    } catch (error) {
      toast.error('Failed to send message');
    }
  };
  
  // Handle typing
  const handleTyping = (e) => {
    setInputMessage(e.target.value);
    
    if (!typingUser && e.target.value.length > 0 && selectedConversation) {
      onTypingStart(selectedConversation.userId, selectedConversation.bookingId);
    }
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (selectedConversation) {
        onTypingStop(selectedConversation.userId, selectedConversation.bookingId);
      }
    }, 1000);
  };
  
  // Listen for new messages
  useEffect(() => {
    const unsubscribe = onNewMessage((data) => {
      // Update messages if current conversation
      if (selectedConversation && data.from.id === selectedConversation.userId) {
        setMessages(prev => [...prev, {
          _id: data.id,
          from: { _id: data.from.id, firstName: data.from.name?.split(' ')[0] },
          message: data.message,
          createdAt: data.timestamp,
          isOwn: false
        }]);
        scrollToBottom();
      }
      
      // Refresh inbox and sent
      fetchInbox();
      fetchSentMessages();
      
      // Show toast for new message if not in current conversation
      if (!selectedConversation || data.from.id !== selectedConversation.userId) {
        toast.info(`New message from ${data.from.name}`);
      }
    });
    
    return () => unsubscribe && unsubscribe();
  }, [onNewMessage, selectedConversation]);
  
  // Listen for typing indicators
  useEffect(() => {
    const unsubscribeStart = onTypingStart((data) => {
      if (selectedConversation && data.fromUserId === selectedConversation.userId) {
        setTypingUser(data.fromName);
        setTimeout(() => setTypingUser(null), 2000);
      }
    });
    
    const unsubscribeStop = onTypingStop((data) => {
      if (selectedConversation && data.fromUserId === selectedConversation.userId) {
        setTypingUser(null);
      }
    });
    
    return () => {
      if (unsubscribeStart) unsubscribeStart();
      if (unsubscribeStop) unsubscribeStop();
    };
  }, [onTypingStart, onTypingStop, selectedConversation]);
  
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };
  
  useEffect(() => {
    fetchInbox();
    fetchSentMessages();
    
    // Refresh every 10 seconds
    const interval = setInterval(() => {
      fetchInbox();
      if (activeFolder === 'sent') fetchSentMessages();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString();
  };
  
  const getInitials = (name) => {
    return name?.charAt(0) || 'U';
  };
  
  const filteredInbox = inbox.filter(item =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredSent = sentMessages.filter(item =>
    item.to?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const styles = {
    container: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    },
    chatWindow: {
      width: '1000px',
      height: '650px',
      backgroundColor: 'white',
      borderRadius: '12px',
      display: 'flex',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
    },
    sidebar: {
      width: '320px',
      backgroundColor: '#f9fafb',
      borderRight: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column'
    },
    sidebarHeader: {
      padding: '20px',
      borderBottom: '1px solid #e5e7eb',
      backgroundColor: '#8b5cf6',
      color: 'white'
    },
    sidebarTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      margin: 0,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    folderTabs: {
      display: 'flex',
      borderBottom: '1px solid #e5e7eb',
      backgroundColor: 'white'
    },
    folderTab: {
      flex: 1,
      padding: '12px',
      textAlign: 'center',
      cursor: 'pointer',
      border: 'none',
      background: 'none',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.2s'
    },
    activeFolderTab: {
      color: '#8b5cf6',
      borderBottom: '2px solid #8b5cf6'
    },
    searchInput: {
      margin: '12px',
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '20px',
      outline: 'none',
      fontSize: '13px'
    },
    conversationsList: {
      flex: 1,
      overflowY: 'auto'
    },
    conversationItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '15px',
      cursor: 'pointer',
      borderBottom: '1px solid #e5e7eb',
      transition: 'background 0.2s'
    },
    avatar: {
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      backgroundColor: '#8b5cf6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontWeight: 'bold',
      fontSize: '18px'
    },
    conversationInfo: {
      flex: 1
    },
    conversationName: {
      fontWeight: 'bold',
      marginBottom: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    roleBadge: {
      fontSize: '10px',
      padding: '2px 6px',
      borderRadius: '10px',
      backgroundColor: '#e0e7ff',
      color: '#4338ca'
    },
    conversationLastMsg: {
      fontSize: '12px',
      color: '#6b7280',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    conversationTime: {
      fontSize: '10px',
      color: '#9ca3af'
    },
    unreadBadge: {
      backgroundColor: '#ef4444',
      color: 'white',
      borderRadius: '10px',
      padding: '2px 6px',
      fontSize: '10px'
    },
    chatArea: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column'
    },
    chatHeader: {
      padding: '15px 20px',
      borderBottom: '1px solid #e5e7eb',
      backgroundColor: '#f9fafb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    chatHeaderInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    chatHeaderName: {
      fontWeight: 'bold'
    },
    chatHeaderRole: {
      fontSize: '12px',
      color: '#6b7280'
    },
    messagesArea: {
      flex: 1,
      padding: '20px',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      backgroundColor: '#fefce8'
    },
    messageRow: {
      display: 'flex',
      justifyContent: 'flex-start'
    },
    messageRowOwn: {
      justifyContent: 'flex-end'
    },
    messageBubble: {
      maxWidth: '70%',
      padding: '10px 14px',
      borderRadius: '12px',
      backgroundColor: '#f3f4f6',
      color: '#374151'
    },
    messageBubbleOwn: {
      backgroundColor: '#8b5cf6',
      color: 'white'
    },
    messageText: {
      fontSize: '14px',
      wordWrap: 'break-word'
    },
    messageTime: {
      fontSize: '10px',
      marginTop: '4px',
      opacity: 0.7
    },
    readReceipt: {
      fontSize: '10px',
      marginTop: '2px',
      textAlign: 'right'
    },
    typingIndicator: {
      padding: '8px 15px',
      fontSize: '12px',
      color: '#6b7280',
      fontStyle: 'italic'
    },
    inputArea: {
      padding: '15px',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      gap: '10px',
      backgroundColor: 'white'
    },
    input: {
      flex: 1,
      padding: '10px 15px',
      border: '1px solid #d1d5db',
      borderRadius: '24px',
      outline: 'none',
      fontSize: '14px'
    },
    sendBtn: {
      backgroundColor: '#8b5cf6',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '24px',
      cursor: 'pointer',
      fontWeight: 'bold'
    },
    closeBtn: {
      background: 'none',
      border: 'none',
      fontSize: '20px',
      cursor: 'pointer',
      color: '#6b7280'
    },
    emptyState: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#9ca3af',
      flexDirection: 'column',
      gap: '10px'
    },
    sentMessageItem: {
      padding: '15px',
      borderBottom: '1px solid #e5e7eb',
      cursor: 'pointer',
      transition: 'background 0.2s'
    },
    sentMessageHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '8px'
    },
    sentMessageTo: {
      fontWeight: 'bold',
      fontSize: '13px'
    },
    sentMessageText: {
      fontSize: '13px',
      color: '#6b7280',
      marginBottom: '4px'
    },
    sentMessageMeta: {
      fontSize: '11px',
      color: '#9ca3af',
      display: 'flex',
      justifyContent: 'space-between'
    },
    readStatus: {
      fontSize: '11px',
      color: '#10b981'
    }
  };
  
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.chatWindow}>
          <div style={styles.emptyState}>Loading...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div style={styles.container}>
      <div style={styles.chatWindow}>
        {/* Sidebar */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <div style={styles.sidebarTitle}>
              <span>💬 Messages</span>
              {unreadCount > 0 && <span style={styles.unreadBadge}>{unreadCount}</span>}
            </div>
            <div style={{ fontSize: '12px', marginTop: '5px' }}>
              {isConnected ? '🟢 Connected' : '🔴 Connecting...'}
            </div>
          </div>
          
          <div style={styles.folderTabs}>
            <button
              style={{
                ...styles.folderTab,
                ...(activeFolder === 'inbox' ? styles.activeFolderTab : {})
              }}
              onClick={() => setActiveFolder('inbox')}
            >
              📥 Inbox
            </button>
            <button
              style={{
                ...styles.folderTab,
                ...(activeFolder === 'sent' ? styles.activeFolderTab : {})
              }}
              onClick={() => setActiveFolder('sent')}
            >
              📤 Sent
            </button>
          </div>
          
          <input
            type="text"
            style={styles.searchInput}
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <div style={styles.conversationsList}>
            {activeFolder === 'inbox' && (
              <>
                {filteredInbox.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                    No messages in inbox
                  </div>
                ) : (
                  filteredInbox.map(conv => (
                    <div
                      key={conv.userId}
                      style={{
                        ...styles.conversationItem,
                        backgroundColor: selectedConversation?.userId === conv.userId ? '#f3e8ff' : 'transparent'
                      }}
                      onClick={() => fetchConversation(conv.userId, conv.name, conv.role, conv.bookingId)}
                    >
                      <div style={styles.avatar}>{getInitials(conv.name)}</div>
                      <div style={styles.conversationInfo}>
                        <div style={styles.conversationName}>
                          {conv.name}
                          {conv.role && <span style={styles.roleBadge}>{conv.role}</span>}
                        </div>
                        <div style={styles.conversationLastMsg}>
                          {conv.lastMessage?.substring(0, 50)}...
                        </div>
                        <div style={styles.conversationTime}>
                          {formatTime(conv.lastMessageTime)}
                        </div>
                      </div>
                      {conv.unreadCount > 0 && (
                        <div style={styles.unreadBadge}>{conv.unreadCount}</div>
                      )}
                    </div>
                  ))
                )}
              </>
            )}
            
            {activeFolder === 'sent' && (
              <>
                {filteredSent.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                    No sent messages
                  </div>
                ) : (
                  filteredSent.map(msg => (
                    <div
                      key={msg.id}
                      style={styles.sentMessageItem}
                      onClick={() => fetchConversation(msg.to.id, msg.to.name, msg.to.role, msg.bookingId)}
                    >
                      <div style={styles.sentMessageHeader}>
                        <span style={styles.sentMessageTo}>To: {msg.to.name}</span>
                        <span style={styles.sentMessageMeta}>{formatTime(msg.sentAt)}</span>
                      </div>
                      <div style={styles.sentMessageText}>{msg.message.substring(0, 60)}...</div>
                      <div style={styles.sentMessageMeta}>
                        <span>{msg.to.role}</span>
                        {msg.read ? (
                          <span style={styles.readStatus}>✓✓ Read</span>
                        ) : (
                          <span>✓ Sent</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Chat Area */}
        <div style={styles.chatArea}>
          {selectedConversation ? (
            <>
              <div style={styles.chatHeader}>
                <div style={styles.chatHeaderInfo}>
                  <div style={styles.avatar}>{getInitials(selectedConversation.userName)}</div>
                  <div>
                    <div style={styles.chatHeaderName}>{selectedConversation.userName}</div>
                    <div style={styles.chatHeaderRole}>{selectedConversation.userRole}</div>
                  </div>
                </div>
                <button style={styles.closeBtn} onClick={onClose}>✕</button>
              </div>
              
              <div style={styles.messagesArea}>
                {loadingMessages ? (
                  <div style={styles.emptyState}>Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div style={styles.emptyState}>
                    <div>💬</div>
                    <div>No messages yet</div>
                    <div style={{ fontSize: '12px' }}>Send a message to start the conversation</div>
                  </div>
                ) : (
                  <>
                    {messages.map(msg => (
                      <div
                        key={msg._id}
                        style={{
                          ...styles.messageRow,
                          ...(msg.from._id === user._id ? styles.messageRowOwn : {})
                        }}
                      >
                        <div
                          style={{
                            ...styles.messageBubble,
                            ...(msg.from._id === user._id ? styles.messageBubbleOwn : {})
                          }}
                        >
                          <div style={styles.messageText}>{msg.message}</div>
                          <div style={styles.messageTime}>
                            {formatTime(msg.createdAt)}
                          </div>
                          {msg.from._id === user._id && msg.read && (
                            <div style={styles.readReceipt}>✓✓ Read</div>
                          )}
                        </div>
                      </div>
                    ))}
                    {typingUser && (
                      <div style={styles.typingIndicator}>
                        {typingUser} is typing...
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
              
              <div style={styles.inputArea}>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="Type a message..."
                  value={inputMessage}
                  onChange={handleTyping}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button style={styles.sendBtn} onClick={handleSendMessage}>
                  Send
                </button>
              </div>
            </>
          ) : (
            <div style={styles.emptyState}>
              <div>💬</div>
              <div>Select a conversation</div>
              <div style={{ fontSize: '12px' }}>Choose a message from the left to start chatting</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
