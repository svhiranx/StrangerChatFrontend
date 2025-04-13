import React from "react";
import Navbar from "./Navbar";
import Sidepane from "./Sidepane";
import "../styles/main.css";

const Layout = ({ children }) => {
  return (
    <div className="app-container">
      <Navbar />
      <div className="app-content">
        <Sidepane />
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
