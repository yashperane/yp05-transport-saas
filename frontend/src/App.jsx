import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardLayout from './pages/DashboardLayout.jsx';
import { Activity } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-3 font-sans">
        <Activity className="w-6 h-6 animate-spin text-sky-400" />
        <span className="text-xs">Authenticating session...</span>
      </div>
    );
  }

  return user ? <DashboardLayout /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
