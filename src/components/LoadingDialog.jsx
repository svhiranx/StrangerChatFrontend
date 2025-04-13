import React from "react";
import "../styles/main.css";

const LoadingDialog = ({ message }) => {
  return (
    <div className="loading-dialog">
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <p className="loading-message">{message}</p>
      </div>
    </div>
  );
};

export default LoadingDialog;
