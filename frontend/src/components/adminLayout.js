// src/components/Layout.js
import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './adminsidebar';
import SalesSidebar from './salessidebar';
import './Layout.css';


function Layout({ children }) {
  const token = localStorage.getItem('token');
  const role = token ? JSON.parse(atob(token.split('.')[1]))?.identity?.role : null;

  let SidebarComponent = null;
  if (role === 'admin') SidebarComponent = <AdminSidebar />;
  else if (role === 'salesperson') SidebarComponent = <SalesSidebar />;

  return (
    <div className="app-layout" style={{display: 'flex'}}>
      {SidebarComponent}
      <div className="main-content" style={{ flex: 1, padding: '20px' }}>{children}
        <Outlet />
      </div>
    </div>
  );
}

export default Layout;
