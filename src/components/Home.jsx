import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useSocket } from "../context/SocketContext";
import Chat from "./Chat";
import "../styles/pages/Home.css";

import {
  closeTab,
  switchTab,
  markChatDisconnected,
} from "../store/slices/tabSlice";

const Home = () => {
  const dispatch = useDispatch();
  const { tabs, activeTab, disconnectedChats } = useSelector(
    (state) => state.tabs
  );
  const isLoading = useSelector((state) => state.queue.isLoading);
  const currentUser = useSelector((state) => state.auth.user);
  const { isConnected, joinQueue, leaveQueue, sendUserDisconnect } =
    useSocket();
  const [tabToClose, setTabToClose] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleStartNewChat = () => {
    if (!isConnected || !currentUser?._id) return;
    joinQueue();
  };

  const handleCancelQueue = () => {
    if (!isConnected || !currentUser?._id) return;
    leaveQueue();
  };

  const handleCloseTab = (tabId, e) => {
    if (e) e.stopPropagation();

    const tab = tabs.find((t) => t.id === tabId);
    if (tab && tab.type === "stranger") {
      if (disconnectedChats.includes(tabId)) {
        dispatch(closeTab(tabId));
        return;
      }
      setTabToClose(tabId);
      setShowConfirmDialog(true);
      return;
    }

    dispatch(closeTab(tabId));
  };

  const handleConfirmClose = () => {
    if (tabToClose) {
      const tab = tabs.find((t) => t.id === tabToClose);
      if (tab && tab.type === "stranger") {
        sendUserDisconnect({ chatCode: tab.code });
      }
      dispatch(closeTab(tabToClose));
    }
    setShowConfirmDialog(false);
    setTabToClose(null);
  };

  const handleSwitchTab = (tabId) => dispatch(switchTab(tabId));
  const handleChatDisconnect = (chatId) =>
    dispatch(markChatDisconnected(chatId));

  return (
    <div className="home-container">
      {activeTab || tabs.length > 0 ? (
        <div className="chat-tabs-container">
          <div className="chat-tabs-header">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`chat-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => handleSwitchTab(tab.id)}
              >
                <span className="tab-title">{tab.partner.name}</span>
                <button
                  className="close-tab"
                  onClick={(e) => handleCloseTab(tab.id, e)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="chat-tabs-content">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`chat-tab-panel ${
                  activeTab === tab.id ? "active" : ""
                }`}
              >
                <Chat
                  id={tab.id}
                  type={tab.type}
                  code={tab.code}
                  partner={tab.partner}
                  onClose={() => dispatch(closeTab(tab.id))}
                  onDisconnect={() => handleChatDisconnect(tab.id)}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="home-content">
          <div className="home-main">
            <div className="welcome-card">
              <h1 className="welcome-title">
                Welcome to StrangerChat, {currentUser.username}
              </h1>
              <p className="welcome-subtitle">
                🎭 Ready to roll the dice on a new conversation?
              </p>
              <div className="welcome-buttons">
                <button
                  className="welcome-button primary"
                  onClick={isLoading ? handleCancelQueue : handleStartNewChat}
                  disabled={!currentUser?.username || !isConnected}
                >
                  {isLoading ? "Cancel Queue" : "Start New Chat"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="loading-dialog">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <p className="loading-message">Looking for a chat partner...</p>
          </div>
        </div>
      )}
      {showConfirmDialog && (
        <div className="confirm-dialog-overlay">
          <div className="confirm-dialog">
            <h3>Leave Chat?</h3>
            <p>
              Are you sure you want to leave this chat? This will disconnect you
              from the stranger.
            </p>
            <div className="confirm-dialog-buttons">
              <button
                className="confirm-dialog-button cancel"
                onClick={() => setShowConfirmDialog(false)}
              >
                Cancel
              </button>
              <button
                className="confirm-dialog-button confirm"
                onClick={handleConfirmClose}
              >
                Leave Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
