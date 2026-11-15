import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  UserCheck,
  LogOut,
  ChevronDown,
  ShieldAlert,
  Box
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/db';
import { UserRole } from '../../types';

export const Header: React.FC<{ onToggleSidebar: () => void }> = ({ onToggleSidebar }) => {
  const { currentUser, role, logout, switchDemoRole } = useAuth();
  const navigate = useNavigate();
  const headerRef = useRef<HTMLElement | null>(null);

  const [activeDropdown, setActiveDropdown] = useState<'notification' | 'profile' | null>(null);

  const isNotificationOpen = activeDropdown === 'notification';
  const isProfileOpen = activeDropdown === 'profile';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const alerts = db.getAlerts().filter((a) => a.status === 'new' || a.status === 'processing');

  const roleLabels: Record<UserRole, string> = {
    admin: 'Quản trị viên (Admin)',
    teacher: 'Giáo viên',
    student: 'Học sinh',
    parent: 'Phụ huynh'
  };

  const handleRoleSwitch = (newRole: UserRole) => {
    switchDemoRole(newRole);
    setActiveDropdown(null);
    if (newRole === 'admin') navigate('/admin/dashboard');
    else if (newRole === 'teacher') navigate('/teacher/dashboard');
    else if (newRole === 'student') navigate('/student/dashboard');
    else if (newRole === 'parent') navigate('/parent/dashboard');
  };

  const displayName =
    role === 'teacher' && (!currentUser?.name || currentUser.name.includes('Trần Thị Mai'))
      ? 'Cô Nguyễn Thị Mai'
      : currentUser?.name || 'Cô Nguyễn Thị Mai';

  return (
    <header
      ref={headerRef}
      className="fixed top-0 left-0 right-0 h-16 z-40 bg-[#040912]/95 backdrop-blur-md border-b border-cyan-500/25 px-4 lg:px-6 flex items-center justify-between gap-4"
    >
      {/* Left: Brand Identity */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-cyan-300 hover:bg-slate-800 border border-cyan-500/30 cursor-pointer"
          aria-label="Toggle Menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div
          onClick={() => navigate(role === 'teacher' ? '/teacher/dashboard' : '/')}
          className="flex items-center gap-3 cursor-pointer"
        >
          <div className="relative w-10 h-10 bg-[#071525] border border-cyan-400/70 flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.2)]">
            <span className="absolute -bottom-[1px] -right-[1px] w-2.5 h-2.5 border-b-2 border-r-2 border-rose-500" />
            <Box className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-base font-mono font-bold text-white tracking-wider leading-none">
              OmniClass
            </h1>
            <p className="text-[10px] font-mono text-cyan-400 mt-1 tracking-tight">
              AI-Powered Learning Management
            </p>
          </div>
        </div>
      </div>

      {/* Center: AI-POWERED CLASS MANAGEMENT SYSTEM HUD Banner */}
      <div className="hidden md:flex items-center justify-center">
        <div className="relative px-6 py-2 bg-[#071426]/90 border border-cyan-500/30 flex items-center gap-3 shadow-[inset_0_0_20px_rgba(0,229,255,0.06)]">
          <span className="w-1.5 h-1.5 bg-cyan-400 shrink-0" />
          <span className="text-[11px] font-mono font-bold tracking-[0.22em] text-cyan-300 uppercase whitespace-nowrap">
            AI-POWERED CLASS MANAGEMENT SYSTEM
          </span>
          <span className="w-1.5 h-1.5 bg-rose-500 shrink-0" />
        </div>
      </div>

      {/* Right: Notification Bell & User Profile */}
      <div className="flex items-center gap-4">
        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setActiveDropdown(isNotificationOpen ? null : 'notification')}
            className="relative p-2 text-cyan-400 hover:text-cyan-200 transition-colors cursor-pointer"
            aria-label="Thông báo"
          >
            <Bell className="w-5 h-5" />
            {alerts.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-[#040912]" />
            )}
          </button>

          {isNotificationOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 omni-card p-3 z-50 shadow-2xl">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 px-2">
                <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
                  Cảnh báo & Thông báo ({alerts.length})
                </span>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {alerts.map((al) => (
                  <div
                    key={al.id}
                    onClick={() => {
                      setActiveDropdown(null);
                      if (role === 'teacher') navigate('/teacher/alerts');
                    }}
                    className="p-3 bg-slate-900/90 hover:bg-slate-800/80 border border-slate-800 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                        {al.title}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{al.description}</p>
                    <p className="text-[11px] text-cyan-400 font-semibold mt-1">
                      {al.studentName} ({al.className})
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setActiveDropdown(isProfileOpen ? null : 'profile')}
            className="flex items-center gap-2.5 py-1 px-2 hover:bg-slate-900/80 transition-colors cursor-pointer"
          >
            <img
              src={
                currentUser?.avatar ||
                'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
              }
              alt={displayName}
              className="w-8 h-8 object-cover border border-cyan-400/60"
            />
            <span className="hidden sm:inline text-xs font-bold text-slate-100">
              {displayName}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-64 omni-card p-2 z-50 shadow-2xl">
              <div className="px-3 py-2 border-b border-slate-800 text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" /> Chuyển đổi vai trò
              </div>
              <div className="space-y-1 mt-1">
                {(['teacher', 'student', 'parent', 'admin'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRoleSwitch(r)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-left transition-colors cursor-pointer ${
                      role === r
                        ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{roleLabels[r]}</span>
                    {role === r && <span className="w-2 h-2 bg-cyan-400" />}
                  </button>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" /> Đăng xuất hệ thống
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};


