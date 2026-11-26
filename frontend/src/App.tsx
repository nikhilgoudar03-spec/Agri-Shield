import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Sidebar } from './components/Sidebar';
import { OfflineIndicator } from './components/OfflineIndicator';

// Public Pages
import { LandingPage } from './pages/LandingPage';
import { FarmerLogin } from './pages/FarmerLogin';
import { FarmerRegister } from './pages/FarmerRegister';
import { AdminLogin } from './pages/AdminLogin';
import { AdminSetup } from './pages/AdminSetup';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';

// Farmer Pages
import { FarmerOverview } from './pages/farmer/FarmerOverview';
import { FarmerLiveSensors } from './pages/farmer/FarmerLiveSensors';
import { FarmerFallDetection } from './pages/farmer/FarmerFallDetection';
import { FarmerGps } from './pages/farmer/FarmerGps';
import { FarmerEmergency } from './pages/farmer/FarmerEmergency';
import { FarmerReports } from './pages/farmer/FarmerReports';
import { FarmerProfile } from './pages/farmer/FarmerProfile';
import { FarmerSettings } from './pages/farmer/FarmerSettings';

// Admin Pages
import { AdminOverview } from './pages/admin/AdminOverview';
import { AdminFarmers } from './pages/admin/AdminFarmers';
import { AdminDevices } from './pages/admin/AdminDevices';
import { AdminLiveMonitoring } from './pages/admin/AdminLiveMonitoring';
import { AdminFallDetection } from './pages/admin/AdminFallDetection';
import { AdminEmergency } from './pages/admin/AdminEmergency';
import { AdminGps } from './pages/admin/AdminGps';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';
import { AdminReports } from './pages/admin/AdminReports';
import { AdminAuditLogs } from './pages/admin/AdminAuditLogs';
import { AdminSettings } from './pages/admin/AdminSettings';
import { Menu } from 'lucide-react';

const PublicLayout: React.FC = () => (
  <div className="flex flex-col min-h-screen">
    <Navbar />
    <main className="flex-1">
      <Outlet />
    </main>
    <Footer />
    <OfflineIndicator />
  </div>
);

const FarmerDashboardLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-xs">Authenticating...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-[#0c1410] text-gray-900 dark:text-gray-100 transition-colors">
      <Sidebar role="FARMER" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden h-14 bg-white dark:bg-charcoal-900 border-b border-gray-200 dark:border-forest-900 px-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-600 dark:text-gray-300"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm text-forest-800 dark:text-leaf-400">AgriShield Farmer</span>
          <div className="w-8" />
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
      <OfflineIndicator />
    </div>
  );
};

const AdminDashboardLayout: React.FC = () => {
  const { user, isAdmin, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-xs">Authenticating Admin...</div>;
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-[#0c1410] text-gray-900 dark:text-gray-100 transition-colors">
      <Sidebar role="ADMIN" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden h-14 bg-white dark:bg-charcoal-900 border-b border-gray-200 dark:border-forest-900 px-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-600 dark:text-gray-300"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm text-amber-500">AgriShield Admin Portal</span>
          <div className="w-8" />
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
      <OfflineIndicator />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<FarmerLogin />} />
          <Route path="/register" element={<FarmerRegister />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/setup" element={<AdminSetup />} />
          <Route path="/dashboard" element={<Navigate to="/farmer/overview" replace />} />
        </Route>

        {/* Farmer Dashboard Routes */}
        <Route path="/farmer" element={<FarmerDashboardLayout />}>
          <Route index element={<Navigate to="/farmer/overview" replace />} />
          <Route path="overview" element={<FarmerOverview />} />
          <Route path="live-sensors" element={<FarmerLiveSensors />} />
          <Route path="sensors" element={<FarmerLiveSensors />} />
          <Route path="fall-detection" element={<FarmerFallDetection />} />
          <Route path="gps" element={<FarmerGps />} />
          <Route path="emergency" element={<FarmerEmergency />} />
          <Route path="reports" element={<FarmerReports />} />
          <Route path="profile" element={<FarmerProfile />} />
          <Route path="settings" element={<FarmerSettings />} />
        </Route>

        {/* Admin Dashboard Routes */}
        <Route path="/admin" element={<AdminDashboardLayout />}>
          <Route index element={<Navigate to="/admin/overview" replace />} />
          <Route path="overview" element={<AdminOverview />} />
          <Route path="farmers" element={<AdminFarmers />} />
          <Route path="devices" element={<AdminDevices />} />
          <Route path="live-monitoring" element={<AdminLiveMonitoring />} />
          <Route path="fall-detection" element={<AdminFallDetection />} />
          <Route path="emergency" element={<AdminEmergency />} />
          <Route path="gps" element={<AdminGps />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
