import React, { useState } from "react";
import { useSelector } from "react-redux";
import { api } from "../config/api";
import "../styles/components/Modal.css";
import "../styles/components/Form.css";

const CreateGroup = ({ onClose }) => {
  const { user } = useSelector((state) => state.auth);
  const [groupName, setGroupName] = useState("");
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [error, setError] = useState("");

  // Get friends from user object
  const friends = user?.friends || [];

  const filteredFriends = friends
    .filter(
      (friend) =>
        friend?.username?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !selectedFriends.some(
          (selected) => selected?.username === friend?.username
        )
    )
    .slice(0, 5); // Limit to 5 friends at a time

  const handleFriendSelect = (friend) => {
    setSelectedFriends([...selectedFriends, friend]);
    setSearchQuery("");
  };

  const handleRemoveFriend = (friendToRemove) => {
    setSelectedFriends(
      selectedFriends.filter(
        (friend) => friend.username !== friendToRemove.username
      )
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError("Please enter a group name");
      return;
    }

    if (selectedFriends.length < 2) {
      setError("Please select at least 2 friends");
      return;
    }

    try {
      await api.post(`/groups/createGroup`, {
        name: groupName,
        participants: selectedFriends.map((friend) => friend._id),
      });

      onClose();
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="create-group-modal">
      <div className="modal-header">
        <h2>Create New Group</h2>
        <button className="close-button" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="modal-body">
        <div className="form-group">
          <label htmlFor="groupName">Group Name</label>
          <input
            type="text"
            id="groupName"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name"
          />
        </div>

        <div className="form-group">
          <label>Select Friends</label>
          <div className="friends-dropdown">
            <div
              className={`dropdown-header ${isDropdownOpen ? "open" : ""}`}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span className="dropdown-placeholder">
                {selectedFriends.length > 0
                  ? `${selectedFriends.length} friends selected`
                  : "Select friends"}
              </span>
              <span
                className={`dropdown-arrow ${isDropdownOpen ? "open" : ""}`}
              >
                ▼
              </span>
            </div>

            {isDropdownOpen && (
              <div className="dropdown-content">
                <div className="dropdown-search">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search friends..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="dropdown-options">
                  {filteredFriends.map((friend) => (
                    <div
                      key={friend.username}
                      className="dropdown-option"
                      onClick={() => handleFriendSelect(friend)}
                    >
                      <div className="friend-avatar">
                        <span className="status-indicator" />
                      </div>
                      <span className="friend-name">{friend.username}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {selectedFriends.length > 0 && (
            <div className="selected-friends">
              {selectedFriends.map((friend) => (
                <div key={friend.username} className="selected-friend">
                  <span className="friend-name">{friend.username}</span>
                  <button
                    className="remove-friend"
                    onClick={() => handleRemoveFriend(friend)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}
      </div>
      <div className="modal-footer">
        <button className="cancel-button" onClick={onClose}>
          Cancel
        </button>
        <button className="create-button" onClick={handleCreateGroup}>
          Create Group
        </button>
      </div>
    </div>
  );
};

export default CreateGroup;
