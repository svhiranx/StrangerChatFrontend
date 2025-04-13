import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchNotifications,
  markNotificationsAsRead,
  acceptFriendRequest,
} from "../store/slices/notificationSlice";
import "../styles/components/Modal.css";

const NotificationsIcon = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const dispatch = useDispatch();
  const { notifications, pendingRequests, unreadCount } = useSelector(
    (state) => state.notifications
  );

  // Initial fetch of notifications
  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      const unreadIds = notifications
        .filter((notification) => !notification.read)
        .map((notification) => notification._id);
      dispatch(markNotificationsAsRead(unreadIds));
    }
  };

  const handleAcceptRequest = (request) => {
    dispatch(acceptFriendRequest(request.from._id));

    // Update UI immediately for better feedback
    setIsOpen(false);
  };

  // Calculate badge count (includes both notifications and friend requests)
  const totalUnreadCount = unreadCount + pendingRequests.length;

  return (
    <div className="notifications-container" ref={dropdownRef}>
      <div className="notifications-icon" onClick={handleNotificationClick}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.37 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.64 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16ZM16 17H8V11C8 8.52 9.51 6.5 12 6.5C14.49 6.5 16 8.52 16 11V17Z"
            fill="currentColor"
          />
        </svg>
        {totalUnreadCount > 0 && (
          <span className="notifications-badge">{totalUnreadCount}</span>
        )}
      </div>
      {isOpen && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <h3>Notifications</h3>
          </div>
          <div className="notifications-content">
            {pendingRequests.length > 0 && (
              <div className="notifications-section">
                <h4>Friend Requests</h4>
                {pendingRequests.map((request) => (
                  <div
                    key={request._id || request.from._id}
                    className="notification-item friend-request"
                  >
                    <span>{request.from.username} wants to be your friend</span>
                    <button
                      className="accept-button"
                      onClick={() => handleAcceptRequest(request)}
                    >
                      Accept
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="notifications-section">
              <h4>Recent</h4>
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`notification-item ${
                      !notification.read ? "unread" : ""
                    }`}
                  >
                    <span>{notification.message}</span>
                    <span className="notification-time">
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="no-notifications">No notifications</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsIcon;
