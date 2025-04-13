import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useSocket } from "../context/SocketContext";
import CreateGroup from "./CreateGroup";
import "../styles/components/Sidepane.css";
import { setCurrentChat } from "../store/slices/chatSlice";
import { updateFriendsList } from "../store/slices/authSlice";
import { api } from "../config/api";
import { addTab } from "../store/slices/tabSlice";

const Sidepane = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState("friends");
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const { socket } = useSocket();
  const dispatch = useDispatch();
  const [activeFriend, setActiveFriend] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const currentUser = useSelector((state) => state.auth.user);

  const groups = useSelector((state) => {
    return state.auth.user?.groups || [];
  });

  const friends = useSelector((state) => state.auth.user?.friends || []);

  const filteredFriends = useMemo(() => {
    return friends.filter((friend) => {
      if (!friend || !friend.username) return false;
      return friend.username.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [friends, searchQuery]);

  const filteredGroups = useMemo(() => {
    return groups.filter((group) => {
      if (!group || !group.name) return false;
      return group.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [groups, searchQuery]);

  useEffect(() => {
    if (!socket) return;

    const handleFriendsList = (data) => {
      if (data && Array.isArray(data.friends)) {
        dispatch(updateFriendsList(data.friends));
        setIsLoading(false);
      }
    };

    socket.on("friendsList", handleFriendsList);

    return () => {
      socket.off("friendsList", handleFriendsList);
    };
  }, [socket, dispatch]);

  const handleFriendClick = useCallback(
    (friend) => {
      if (!friend || !friend.username) return;

      setActiveFriend(friend._id);
      dispatch(
        setCurrentChat({
          type: "friend",
          code: friend.chatRoom,
        })
      );

      // Mark messages as read when opening chat
      if (friend.unreadMessages > 0) {
        socket.emit("markMessagesAsRead", { chatCode: friend.chatRoom });
      }

      if (!friend.chatRoom) {
        console.error(
          `No chat room ID found for friend: ${friend.username} (ID: ${friend._id})`
        );
        return;
      }

      const newChat = {
        type: "friend",
        code: friend.chatRoom,
        partner: { _id: friend._id, name: friend.username },
      };

      dispatch(
        addTab({
          id: `${newChat.type}-${newChat.code}`,
          ...newChat,
        })
      );
    },
    [dispatch, socket]
  );

  const handleGroupClick = useCallback((group) => {
    if (!group || !group._id) return;

    const newChat = {
      type: "group",
      code: group.chatRoom,
      partner: { _id: group._id, name: group.name },
    };
    dispatch(
      addTab({
        id: `${newChat.type}-${newChat.code}`,
        ...newChat,
      })
    );
  }, []);

  const handleLeaveGroup = useCallback(
    async (groupId, e) => {
      e.stopPropagation();
      try {
        await api.delete(`/groups/${groupId}/leave`, {
          headers: {
            "Content-Type": "application/json",
          },
        });
        setOpenDropdownId(null);

        dispatch({
          type: "auth/updateUser",
          payload: {
            ...currentUser,
            groups: (currentUser?.groups || []).filter(
              (group) => group.chatRoom !== groupId // replace with actual group ID
            ),
          },
        });
      } catch (error) {
        console.error("Error leaving group:", error);
      }
    },
    [socket]
  );

  const handleCreateGroup = useCallback(() => {
    setShowCreateGroupModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowCreateGroupModal(false);
  }, []);

  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  const handleDropdownToggle = (e, groupId) => {
    e.stopPropagation();
    setOpenDropdownId((prev) => (prev === groupId ? null : groupId));
  };

  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenDropdownId(null);
    };

    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);
  return (
    <div className={`sidepane ${isMinimized ? "minimized" : ""}`}>
      <div className="sidepane-header">
        <div className="sidepane-header-content">
          <div className="sidepane-title-container" onClick={toggleMinimize}>
            <i className="fas fa-users sidepane-icon"></i>
            <h2 className="sidepane-title">Chats</h2>
          </div>
          {!isMinimized && (
            <button className="minimize-button" onClick={toggleMinimize}>
              <i className="fas fa-chevron-left"></i>
            </button>
          )}
        </div>
        {!isMinimized && (
          <div className="tabs-container">
            <button
              className={`tab-button ${
                activeTab === "friends" ? "active" : ""
              }`}
              onClick={() => setActiveTab("friends")}
            >
              Friends
            </button>
            <button
              className={`tab-button ${activeTab === "groups" ? "active" : ""}`}
              onClick={() => setActiveTab("groups")}
            >
              Groups
            </button>
          </div>
        )}
        {!isMinimized && (
          <div className="search-container">
            <i className="fas fa-search search-icon"></i>
            <input
              type="text"
              className="search-input"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </div>
      <div className="sidepane-divider"></div>
      <div className="sidepane-content">
        {!isMinimized && isLoading ? (
          <div className="no-friends-message">Loading...</div>
        ) : activeTab === "friends" ? (
          <>
            {filteredFriends.length === 0 ? (
              <div className="no-friends-message">No friends yet</div>
            ) : (
              filteredFriends.map((friend) => (
                <div
                  key={friend._id}
                  className={`sidepane-item ${
                    activeFriend === friend._id ? "active" : ""
                  }`}
                  onClick={() => handleFriendClick(friend)}
                >
                  <div className="sidepane-avatar">
                    {friend.username.charAt(0).toUpperCase()}
                    <div
                      className={`status-indicator ${
                        friend.isOnline ? "online" : ""
                      }`}
                    />
                  </div>
                  <div className="sidepane-info">
                    <span className="sidepane-name">{friend.username}</span>
                    <span className="sidepane-status">
                      {friend.isOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                  {friend.unreadMessages > 0 && (
                    <div className="unread-badge">{friend.unreadMessages}</div>
                  )}
                </div>
              ))
            )}
          </>
        ) : (
          <>
            <button className="create-group-button" onClick={handleCreateGroup}>
              <i className="fas fa-plus"></i> Create New Group
            </button>
            {filteredGroups.length === 0 ? (
              <div className="no-friends-message">No groups yet</div>
            ) : (
              filteredGroups.map((group) => (
                <div
                  key={group._id}
                  className="sidepane-item"
                  onClick={() => handleGroupClick(group)}
                >
                  <div className="sidepane-avatar group-avatar">
                    <i className="fas fa-users"></i>
                  </div>
                  <div className="sidepane-info">
                    <span className="sidepane-name">{group.name}</span>
                    <span className="sidepane-status">Group</span>
                  </div>
                  <div className="sidepane-actions">
                    <div className="dropdown">
                      <button
                        className="dropdown-toggle"
                        onClick={(e) => handleDropdownToggle(e, group._id)}
                      >
                        ⋮
                      </button>

                      <div
                        className={`dropdown-menu ${
                          openDropdownId === group._id ? "show" : ""
                        }`}
                      >
                        <button
                          className="dropdown-item leave-group"
                          onClick={(e) => handleLeaveGroup(group.chatRoom, e)}
                        >
                          Leave Group
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
      {showCreateGroupModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <CreateGroup onClose={handleCloseModal} />
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(Sidepane);
