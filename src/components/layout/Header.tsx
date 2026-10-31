import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Plus,
  UserCheck,
  LogOut,
  ChevronDown,
  Sparkles,
  Users,
  BookOpen,
  CalendarCheck,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useClass } from '../../contexts/ClassContext';
import { db } from '../../services/db';
import { UserRole } from '../../types';

export const Header: React.FC<{ onToggleSidebar: () => void }> = ({ onToggleSidebar }) => {
  const { currentUser, role, logout, switchDemoRole } = useAuth();
  const { classes, selectedClassId, setSelectedClassId } = useClass();
  const navigate = useNavigate();
  const headerRef = useRef<HTMLElement | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<'search' | 'notification' | 'quickCreate' | 'role' | null>(null);

  const isSearchOpen = activeDropdown === 'search';
  const isNotificationOpen = activeDropdown === 'notification';
  const isQuickCreateOpen = activeDropdown === 'quickCreate';
  const isRoleDropdownOpen = activeDropdown === 'role';

  const setIsSearchOpen = (open: boolean) => setActiveDropdown(open ? 'search' : null);
  const setIsNotificationOpen = (open: boolean) => setActiveDropdown(open ? 'notification' : null);
  const setIsQuickCreateOpen = (open: boolean) => setActiveDropdown(open ? 'quickCreate' : null);
  const setIsRoleDropdownOpen = (open: boolean) => setActiveDropdown(open ? 'role' : null);

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
  const students = db.getStudents();
  const assignments = db.getAssignments();

  // Filter search results
  const searchResults = searchQuery.trim()
    ? {
        students: students.filter((s) => s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || s.code.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 4),
        classes: classes.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase())),
        assignments: assignments.filter((a) => a.title.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 3)
      }
    : null;

  const roleLabels: Record<UserRole, { label: string; badgeColor: string }> = {
    admin: { label: 'Quản trị viên (Admin)', badgeColor: 'bg-rose-950/80 text-rose-300 border-rose-800/60' },
    teacher: { label: 'Giáo viên', badgeColor: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60' },
    student: { label: 'Học sinh', badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60' },
    parent: { label: 'Phụ huynh', badgeColor: 'bg-purple-950/80 text-purple-300 border-purple-800/60' }
  };

  const handleRoleSwitch = (newRole: UserRole) => {
    switchDemoRole(newRole);
    setActiveDropdown(null);
    if (newRole === 'admin') navigate('/admin/dashboard');
    else if (newRole === 'teacher') navigate('/teacher/dashboard');
    else if (newRole === 'student') navigate('/student/dashboard');
    else if (newRole === 'parent') navigate('/parent/dashboard');
  };

  return (
    <header ref={headerRef} className="sticky top-0 z-30 bg-[#080e1c]/95 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Class Quick-select */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-300 hover:bg-slate-800 border border-slate-700"
          aria-label="Toggle Menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {role === 'teacher' && (
          <div className="hidden sm:flex items-center gap-2 bg-[#0f172a] border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-300">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>Lớp:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-transparent font-bold text-cyan-400 outline-none cursor-pointer"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-slate-100">
                  {c.name} ({c.studentCount} HS)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Middle: Global Search */}
      <div className="relative flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm học sinh, lớp học, bài tập..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            className="w-full bg-[#0f172a] hover:bg-slate-800/80 focus:bg-[#0f172a] text-sm text-slate-100 placeholder-slate-500 pl-9.5 pr-4 py-2 rounded-xl border border-slate-800 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all"
          />
        </div>

        {/* Search Results Dropdown */}
        {isSearchOpen && searchQuery.trim() && searchResults && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f172a] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden z-50 p-3 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center px-2 pb-2 mb-2 border-b border-slate-800 text-xs text-slate-400 font-semibold uppercase">
              <span>Kết quả tìm kiếm cho "{searchQuery}"</span>
              <button onClick={() => setIsSearchOpen(false)} className="hover:text-slate-200">
                Đóng
              </button>
            </div>

            {/* Students */}
            {searchResults.students.length > 0 && (
              <div className="mb-3">
                <span className="text-xs font-bold text-slate-400 px-2 uppercase">Học sinh</span>
                <div className="mt-1 space-y-1">
                  {searchResults.students.map((st) => (
                    <div
                      key={st.id}
                      onClick={() => {
                        navigate(`/teacher/students/${st.id}`);
                        setIsSearchOpen(false);
                      }}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/80 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <img src={st.avatar} alt={st.fullName} className="w-7 h-7 rounded-full object-cover" />
                        <div>
                          <p className="text-xs font-bold text-slate-100">{st.fullName}</p>
                          <p className="text-[11px] text-slate-400">
                            {st.code} • Lớp {st.className}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1">
                        Xem hồ sơ <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assignments */}
            {searchResults.assignments.length > 0 && (
              <div>
                <span className="text-xs font-bold text-slate-400 px-2 uppercase">Bài tập</span>
                <div className="mt-1 space-y-1">
                  {searchResults.assignments.map((asn) => (
                    <div
                      key={asn.id}
                      onClick={() => {
                        navigate(`/teacher/assignments`);
                        setIsSearchOpen(false);
                      }}
                      className="p-2 rounded-xl hover:bg-slate-800/80 cursor-pointer transition-colors"
                    >
                      <p className="text-xs font-bold text-slate-100">{asn.title}</p>
                      <p className="text-[11px] text-slate-400">
                        {asn.subject} • Lớp {asn.className} • Hạn nộp: {new Date(asn.dueDate).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchResults.students.length === 0 && searchResults.assignments.length === 0 && (
              <p className="text-center py-4 text-xs text-slate-500">Không tìm thấy kết quả phù hợp</p>
            )}
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2.5">
        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className="relative p-2.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800 bg-[#0f172a] transition-colors cursor-pointer"
            aria-label="Thông báo"
          >
            <Bell className="w-4 h-4" />
            {alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {alerts.length}
              </span>
            )}
          </button>

          {isNotificationOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#0f172a] rounded-2xl border border-slate-800 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 px-2">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Cảnh báo & Thông báo mới</span>
                <span className="text-[11px] font-semibold text-rose-400 bg-rose-950/70 border border-rose-800/50 px-2 py-0.5 rounded-full">
                  {alerts.length} việc cần xử lý
                </span>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {alerts.map((al) => (
                  <div
                    key={al.id}
                    onClick={() => {
                      setIsNotificationOpen(false);
                      if (role === 'teacher') navigate('/teacher/alerts');
                    }}
                    className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                        {al.title}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(al.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{al.description}</p>
                    <p className="text-[11px] text-cyan-400 font-semibold mt-1.5">{al.studentName} ({al.className})</p>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-slate-800 text-center mt-2">
                <button
                  onClick={() => {
                    setIsNotificationOpen(false);
                    if (role === 'teacher') navigate('/teacher/alerts');
                    else if (role === 'student') navigate('/student/notifications');
                    else if (role === 'parent') navigate('/parent/notifications');
                  }}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Xem tất cả trung tâm thông báo →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Demo Role Switcher Badge & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xs cursor-pointer ${
              role ? roleLabels[role].badgeColor : 'bg-slate-800 text-slate-200 border-slate-700'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Vai trò:</span>
            <span>{role ? roleLabels[role].label.split(' ')[0] : 'Khách'}</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {isRoleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[#0f172a] rounded-2xl border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Chuyển đổi vai trò trải nghiệm
              </div>
              <div className="space-y-1 mt-1">
                {(['teacher', 'student', 'parent', 'admin'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRoleSwitch(r)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ${
                      role === r ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-800/40' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{roleLabels[r].label}</span>
                    {role === r && <span className="w-2 h-2 rounded-full bg-cyan-400"></span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <img
            src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt={currentUser?.name}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-cyan-500/30"
          />
          <div className="hidden lg:block text-left">
            <p className="text-xs font-bold text-slate-100 line-clamp-1">{currentUser?.name}</p>
            <p className="text-[10px] text-slate-400 capitalize">{role}</p>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            title="Đăng xuất"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

