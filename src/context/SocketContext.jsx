import React, {
  createContext,
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
  useMemo,
} from "react";
import { useSelector, useDispatch } from "react-redux";
import { io } from "socket.io-client";
import { addMessage } from "../store/slices/chatSlice";
import {
  fetchNotifications,
  updateFriendRequestStatus,
} from "../store/slices/notificationSlice";
import { setIsLoading } from "../store/slices/queueSlice";
import { addTab } from "../store/slices/tabSlice";

const SOCKET_URL = "http://localhost:5000";
const RECONNECTION_TIMEOUT = 5000;

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectionAttempts, setReconnectionAttempts] = useState(0);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.auth.user);
  const token = localStorage.getItem("authToken");
  const typingUsersRef = useRef({});
  const sentMessagesRef = useRef(new Set());

  const initializeSocket = () => {
    if (!token || !currentUser?.username) {
      return;
    }

    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.close();
    }

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketRef.current = newSocket;

    newSocket.on("connect", () => {
      setIsConnected(true);
      setReconnectionAttempts(0);
      setSocket(newSocket);
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      reconnectTimeoutRef.current = setTimeout(() => {
        if (!isConnected) {
          setReconnectionAttempts((prev) => {
            const newAttempts = prev + 1;
            if (newAttempts >= 5) {
              setIsConnected(false);
              return newAttempts;
            }
            return newAttempts;
          });
          initializeSocket();
        }
      }, RECONNECTION_TIMEOUT);
    });

    newSocket.on("message", (messageOrMessages) => {
      if (Array.isArray(messageOrMessages)) {
        messageOrMessages.forEach((msg) => {
          processMessage(msg);
        });
      } else if (messageOrMessages) {
        processMessage(messageOrMessages);
      }
    });

    newSocket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket connect error:", error);
    });

    newSocket.on("userLeft", (data) => {
      if (data && data.chatCode) {
        processMessage({
          _id: `system-${Date.now()}`,
          message: data.message || "A user has left the chat",
          chatCode: data.chatCode,
          type: "system",
          timestamp: new Date().toISOString(),
        });
      }
    });

    newSocket.on("userDisconnected", (data) => {
      if (data && data.chatCode) {
        processMessage({
          _id: `system-${Date.now()}`,
          message: data.message || "A user has disconnected",
          chatCode: data.chatCode,
          type: "system",
          timestamp: new Date().toISOString(),
        });
      }
    });

    newSocket.on("userTyping", ({ username, chatCode, timestamp }) => {
      if (username !== currentUser?.username) {
        const chatId = chatCode;

        typingUsersRef.current[chatId] = {
          username,
          timestamp,
        };

        // Clear typing status after a delay
        setTimeout(() => {
          const currentTypingData = typingUsersRef.current[chatId];
          if (currentTypingData && currentTypingData.timestamp === timestamp) {
            delete typingUsersRef.current[chatId];
          }
        }, 3000);
      }
    });

    newSocket.on("friendRequestSent", ({ to }) => {
      dispatch({
        type: "auth/updateFriendRequestStatus",
        payload: {
          requestType: "sent",
          userId: to._id,
          status: "pending",
        },
      });
    });

    newSocket.on("friendRequestReceived", ({ request }) => {
      dispatch({
        type: "auth/updateFriendRequestStatus",
        payload: {
          requestType: "received",
          userId: request.from._id,
          status: "pending",
        },
      });

      dispatch(fetchNotifications());
    });

    newSocket.on("friendRequestAccepted", ({ friend }) => {
      dispatch({
        type: "auth/updateFriendRequestStatus",
        payload: {
          requestType: "sent",
          userId: friend._id,
          status: "accepted",
        },
      });

      dispatch(
        updateFriendRequestStatus({
          fromUserId: friend._id,
          status: "accepted",
        })
      );

      dispatch(fetchNotifications());

      if (socket && isConnected) {
        socket.emit("getFriendsList");
      }
    });

    newSocket.on("friendRequestAcceptedByMe", ({ friend }) => {
      dispatch({
        type: "auth/updateFriendRequestStatus",
        payload: {
          requestType: "received",
          userId: friend._id,
          status: "accepted",
        },
      });

      dispatch(
        updateFriendRequestStatus({
          fromUserId: friend._id,
          status: "accepted",
        })
      );

      dispatch(fetchNotifications());
      if (socket && isConnected) {
        socket.emit("getFriendsList");
      }
    });

    newSocket.on("authenticated", ({ user }) => {
      if (user) {
        dispatch({
          type: "auth/updateUser",
          payload: {
            ...currentUser,
            ...user,
          },
        });
      }
    });
    dispatch(fetchNotifications());
    newSocket.emit("authenticate", token);
  };

  const processMessage = (msg) => {
    if (!msg) return;

    let chatId = msg.chatCode;
    if (!chatId) {
      return;
    }

    const messageText = msg.message;
    if (!messageText) {
      return;
    }

    const messageData = {
      id: msg._id || `temp-${Date.now()}`,
      text: messageText,
      sender:
        msg.type === "system"
          ? "system"
          : msg.username === currentUser?.username
          ? "me"
          : msg.username || "unknown",
      timestamp: msg.timestamp || new Date().toISOString(),
      type: msg.type || "message",
    };

    dispatch(
      addMessage({
        chatId,
        message: messageData,
      })
    );
  };

  useEffect(() => {
    if (currentUser?.username && token) {
      initializeSocket();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [currentUser?.username, token, dispatch]);

  useEffect(() => {
    if (!socket) return;

    const chatMatchedHandler = ({ chatCode, partner }) => {
      dispatch(setIsLoading(false));
      dispatch(
        addTab({
          type: "stranger",
          code: chatCode,
          id: `stranger-${chatCode}`,
          partner: {
            _id: partner._id,
            name: partner.username,
          },
        })
      );
    };

    socket.on("chatMatched", chatMatchedHandler);
    socket.on("queueJoined", ({ message }) =>
      console.log("Queue joined:", message)
    );
    socket.on("queueLeft", () => dispatch(setIsLoading(false)));
    socket.on("queueError", () => dispatch(setIsLoading(false)));

    return () => {
      socket.off("chatMatched", chatMatchedHandler);
      socket.off("queueJoined");
      socket.off("queueLeft");
      socket.off("queueError");
    };
  }, [socket, dispatch]);

  const joinRoom = (chatCode, chatType) => {
    if (!socket || !currentUser?.username || !isConnected) return;

    socket.emit("joinRoom", {
      chatCode,
      username: currentUser.username,
      chatType,
    });
  };

  const sendMessage = (chatCode, messageData) => {
    if (!socket || !isConnected || !messageData?.message?.trim()) {
      return;
    }

    const messageFingerprint = `${currentUser._id}-${chatCode}-${
      messageData.message
    }-${new Date().getTime()}`;

    sentMessagesRef.current.add(messageFingerprint);

    setTimeout(() => {
      sentMessagesRef.current.delete(messageFingerprint);
    }, 10000);

    socket.emit("message", {
      chatCode,
      message: messageData.message,
      timestamp: messageData.timestamp,
      username: currentUser.username,
      type: "message",
      fingerprint: messageFingerprint,
    });
  };

  const sendTypingEvent = useCallback(
    (chatCode) => {
      if (!socket || !currentUser?.username || !isConnected) return;

      let chatType = "stranger";
      if (chatCode.startsWith("friend-")) {
        chatType = "friend";
      } else if (chatCode.startsWith("group-")) {
        chatType = "group";
      }

      socket.emit("typing", {
        chatCode,
        username: currentUser.username,
        chatType,
        timestamp: Date.now(),
      });
    },
    [socket, isConnected, currentUser?.username]
  );

  const isUserTypingInChat = useCallback((chatId) => {
    return typingUsersRef.current[chatId] ?? false;
  }, []);

  const sendFriendRequest = (targetUserId) => {
    if (!socket || !isConnected) return;

    socket.emit("sendFriendRequest", { targetUserId });
  };

  const acceptFriendRequest = (fromUserId) => {
    if (!socket || !isConnected) return;

    socket.emit("acceptFriendRequest", { fromUserId });
  };

  const joinQueue = () => {
    if (!socket || !isConnected || !currentUser?._id) return;
    dispatch(setIsLoading(true));
    socket.emit("joinQueue", currentUser._id);
  };

  const leaveQueue = () => {
    if (!socket || !isConnected || !currentUser?._id) return;
    dispatch(setIsLoading(false));
    socket.emit("leaveQueue", currentUser._id);
  };

  const sendUserDisconnect = (data) => {
    if (!socket || !isConnected || !currentUser?._id) return;

    socket.emit("userDisconnect", data);
  };

  const loadChatHistory = (chatId) => {
    if (!socket || !isConnected) {
      return;
    }

    socket.emit("loadMessages", chatId);
  };

  const loadFriendsList = useCallback(() => {
    if (!socket || !isConnected) {
      return;
    }

    if (!currentUser) {
      return;
    }

    socket.emit("getFriendsList");
  }, [socket, isConnected, currentUser]);

  useEffect(() => {
    if (!socket) return;

    const friendsListHandler = (data) => {
      if (data && Array.isArray(data.friends)) {
        if (!currentUser) {
          return;
        }

        const updatedUser = {
          ...currentUser,
          friends: data.friends,
        };

        dispatch({
          type: "auth/updateUser",
          payload: updatedUser,
        });
      }
    };

    const unreadMessageHandler = (data) => {
      if (!data || !data.chatCode || !currentUser) return;
      const updatedUser = {
        ...currentUser,
        friends: currentUser.friends.map((friend) => {
          if (friend.chatRoom === data.chatCode) {
            return {
              ...friend,
              unreadMessages: data.unreadCount,
            };
          }
          return friend;
        }),
      };

      dispatch({
        type: "auth/updateUser",
        payload: updatedUser,
      });
    };

    socket.on("friendsList", friendsListHandler);
    socket.on("unreadMessageUpdate", unreadMessageHandler);

    return () => {
      socket.off("friendsList", friendsListHandler);
      socket.off("unreadMessageUpdate", unreadMessageHandler);
    };
  }, [socket, dispatch, currentUser]);

  useEffect(() => {
    if (!socket) return;

    const groupCreatedHandler = (data) => {
      if (data && data.group) {
        dispatch({
          type: "auth/updateUser",
          payload: {
            ...currentUser,
            groups: [
              ...(currentUser?.groups || []),
              {
                _id: data.group._id + "temp",
                chatRoom: data.group._id,
                name: data.group.name,
                joinedAt: data.group.createdAt,
              },
            ],
          },
        });
      }
    };

    socket.on("groupUpdate", groupCreatedHandler);

    return () => {
      socket.off("groupUpdate", groupCreatedHandler);
    };
  }, [socket, dispatch, currentUser]);

  const value = useMemo(
    () => ({
      socket,
      isConnected,
      reconnectionAttempts,
      joinRoom,
      sendUserDisconnect,
      sendMessage,
      sendTypingEvent,
      sendFriendRequest,
      acceptFriendRequest,
      joinQueue,
      leaveQueue,
      isUserTypingInChat,
      loadChatHistory,
      loadFriendsList,
    }),
    [
      socket,
      isConnected,
      reconnectionAttempts,
      joinRoom,
      sendUserDisconnect,
      sendMessage,
      sendTypingEvent,
      sendFriendRequest,
      acceptFriendRequest,
      joinQueue,
      leaveQueue,
      isUserTypingInChat,
      loadChatHistory,
      loadFriendsList,
    ]
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export default SocketContext;
