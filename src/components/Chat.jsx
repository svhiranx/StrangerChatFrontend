import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentChat } from "../store/slices/chatSlice";
import { useSocket } from "../context/SocketContext";
import { updateFriendRequestStatus } from "../store/slices/authSlice";
import "../styles/components/Chat.css";

const Chat = ({ id, type, code, onClose, onDisconnect, partner }) => {
  const emptyArray = useMemo(() => [], []);
  const dispatch = useDispatch();
  const [message, setMessage] = useState("");
  const [strangerDisconnected, setStrangerDisconnected] = useState(false);
  const messagesEndRef = useRef(null);
  const chatId = `${code}`;
  const messages = useSelector(
    (state) => state.chat.messages[chatId] || emptyArray
  );
  const currentUser = useSelector((state) => state.auth.user);
  const [friendRequestStatus, setFriendRequestStatus] = useState("none");
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const typingIndicatorRef = useRef(null);

  const {
    isUserTypingInChat,
    isConnected,
    reconnectionAttempts,
    sendMessage,
    sendTypingEvent,
    sendFriendRequest,
    acceptFriendRequest,
    loadChatHistory,
    socket,
  } = useSocket();

  useEffect(() => {
    if (type !== "stranger" || !socket) return;

    const handleStrangerDisconnect = (data) => {
      if (data.chatCode === code) {
        setStrangerDisconnected(true);
        onDisconnect();
      }
    };

    socket.on("userDisconnected", handleStrangerDisconnect);

    return () => {
      socket.off("userDisconnected", handleStrangerDisconnect);
    };
  }, [type, code, socket]);

  const [typingUser, setTypingUser] = useState(null);

  useEffect(() => {
    const checkTypingStatus = () => {
      const typingData = isUserTypingInChat(chatId);

      if (typingData) {
        setTypingUser(typingData.username);
      } else {
        setTypingUser("");
      }
    };

    const intervalId = setInterval(checkTypingStatus, 500);

    checkTypingStatus();

    return () => clearInterval(intervalId);
  }, [chatId, isUserTypingInChat]);

  useEffect(() => {
    if (!partner || !currentUser) return;

    const hasPendingRequest = currentUser.pendingFriendRequests?.some(
      (req) =>
        req.from && (req.from._id === partner._id || req.from === partner._id)
    );

    const hasSentRequest = currentUser.sentFriendRequests?.some(
      (req) => req.to && (req.to === partner._id || req.to._id === partner._id)
    );

    const areFriends = currentUser.friends?.some(
      (friend) => friend._id === partner._id
    );

    if (areFriends) {
      setFriendRequestStatus("accepted");
    } else if (hasPendingRequest) {
      setFriendRequestStatus("received");
    } else if (hasSentRequest) {
      setFriendRequestStatus("sent");
    }
  }, [partner, currentUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    dispatch(setCurrentChat({ type, code }));
  }, [type, code, dispatch]);

  const historyLoadedRef = useRef(false);

  useEffect(() => {
    if (!historyLoadedRef.current && isConnected && currentUser?.username) {
      loadChatHistory(code, type);

      historyLoadedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, currentUser?.username]);

  const handleTyping = useCallback(() => {
    if (!isConnected || !socket) return;

    if (!isTyping) {
      setIsTyping(true);
      sendTypingEvent(chatId);
    }

    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    const timeout = setTimeout(() => {
      setIsTyping(false);
    }, 3000);

    setTypingTimeout(timeout);
  }, [
    isConnected,
    socket,
    isTyping,
    typingTimeout,
    sendTypingEvent,
    chatId,
    type,
  ]);

  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [typingTimeout]);

  const handleInputChange = useCallback(
    (e) => {
      setMessage(e.target.value);
      handleTyping();
    },
    [handleTyping]
  );

  const handleSendMessage = useCallback(
    (e) => {
      e.preventDefault();
      if (!message.trim() || !isConnected || !socket) return;

      const trimmedMessage = message.trim();

      const messageData = {
        chatCode: code,
        message: trimmedMessage,
        timestamp: new Date().toISOString(),
        username: currentUser.username,
        type: type,
      };

      sendMessage(code, messageData, type);

      setMessage("");
      setIsTyping(false);
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    },
    [
      message,
      isConnected,
      socket,
      type,
      code,
      currentUser.username,
      sendMessage,
      typingTimeout,
    ]
  );

  const getFriendButtonText = () => {
    switch (friendRequestStatus) {
      case "sent":
        return `Friend Request Sent to ${partner.name}`;
      case "received":
        return `Accept ${partner.name}'s Friend Request`;
      case "accepted":
        return `Friends with ${partner.name}`;
      default:
        return `Add ${partner.name} as Friend`;
    }
  };

  const getFriendButtonDisabled = () => {
    return friendRequestStatus === "sent" || friendRequestStatus === "accepted";
  };

  const handleFriendAction = () => {
    if (!partner?._id || getFriendButtonDisabled() || !isConnected) return;

    if (friendRequestStatus === "received") {
      acceptFriendRequest(partner._id);

      setFriendRequestStatus("accepted");

      dispatch(
        updateFriendRequestStatus({
          requestType: "received",
          userId: partner._id,
          status: "accepted",
        })
      );
    } else if (friendRequestStatus === "none") {
      sendFriendRequest(partner._id);

      setFriendRequestStatus("sent");

      dispatch(
        updateFriendRequestStatus({
          requestType: "sent",
          userId: partner._id,
          status: "pending",
        })
      );
    }
  };

  const closeChat = () => {
    if (type === "stranger" && !strangerDisconnected && socket) {
      socket.emit("userDisconnect", { chatCode: code });
    }
    onClose(id);
  };

  const messagesList = useMemo(
    () =>
      messages.map((msg) => (
        <div
          key={msg.id}
          className={`message ${
            msg.type === "system"
              ? "system"
              : msg.sender === "me"
              ? "sent"
              : "received"
          }`}
        >
          <div className="message-content">
            {msg.sender !== "me" && msg.type !== "system" && (
              <div className="message-sender">{msg.sender}</div>
            )}
            {msg.type === "system" ? (
              <span className="system-message">{msg.text}</span>
            ) : (
              msg.text
            )}
          </div>
          <div className="message-time">
            {new Date(msg.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      )),
    [messages]
  );

  return (
    <div className="chat-container">
      {!isConnected && (
        <div className="connection-status">
          <div className="connection-message">
            {reconnectionAttempts > 0
              ? `Reconnecting... (Attempt ${reconnectionAttempts}/5)`
              : "Connecting..."}
          </div>
        </div>
      )}
      <div className="chat-header">
        <div className="chat-title">
          <h2>
            {type === "friend"
              ? `You are chatting with friend ${partner.name || "Unknown"}`
              : type === "stranger"
              ? `You are chatting with stranger ${partner.name || "Unknown"}`
              : `You are chatting in group ${partner?.name || "Unknown"}`}
          </h2>
          {type === "stranger" && partner && (
            <button
              className={`add-friend-button ${friendRequestStatus}`}
              onClick={handleFriendAction}
              disabled={getFriendButtonDisabled()}
            >
              {getFriendButtonText()}
            </button>
          )}
        </div>
      </div>
      <div className="chat-messages">
        {messagesList}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-container">
        <form onSubmit={handleSendMessage} className="chat-form">
          <input
            type="text"
            value={message}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="chat-input"
            disabled={!isConnected}
          />
          <button
            type="submit"
            className="send-button"
            disabled={!isConnected || !message.trim()}
          >
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              className="send-icon"
            >
              <path
                d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"
                fill="currentColor"
              />
            </svg>
          </button>
        </form>
        {typingUser && (
          <div ref={typingIndicatorRef} className="typing-indicator">
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className="typing-text">{typingUser} is typing...</span>
          </div>
        )}
      </div>
      {strangerDisconnected ? (
        <div className="stranger-disconnected">
          <p>The stranger has disconnected</p>
          <button className="close-chat-button" onClick={closeChat}>
            Close Chat
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default React.memo(Chat);
