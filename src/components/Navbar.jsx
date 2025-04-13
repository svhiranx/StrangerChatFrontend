import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { signout } from "../store/slices/authSlice";
import NotificationsIcon from "./NotificationsIcon";
import "../styles/components/Navbar.css";
import { useSocket } from "../context/SocketContext";

const Navbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { joinQueue, isConnected } = useSocket();
  const currentUser = useSelector((state) => state.auth.user);
  const handleLogout = () => {
    dispatch(signout());
    navigate("/signin");
  };

  const handleNewChat = () => {
    if (!isConnected || !currentUser?._id) return;

    joinQueue();
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <svg
          className="navbar-icon"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z"
            fill="currentColor"
          />
          <path
            d="M12 6C8.69 6 6 8.69 6 12C6 15.31 8.69 18 12 18C15.31 18 18 15.31 18 12C18 8.69 15.31 6 12 6ZM12 16C9.79 16 8 14.21 8 12C8 9.79 9.79 8 12 8C14.21 8 16 9.79 16 12C16 14.21 14.21 16 12 16Z"
            fill="currentColor"
          />
        </svg>
        <h1 className="navbar-title">StrangerChat</h1>
      </div>
      <div className="navbar-actions">
        <NotificationsIcon />
        <button className="new-chat-btn" onClick={handleNewChat}>
          New Chat
        </button>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
