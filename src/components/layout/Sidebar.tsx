import React, { useState, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  Users,
  GraduationCap,
  Check,
  Award,
  BookOpen,
  Sparkles,
  ShieldAlert,
  Dices,
  Bell,
  Database,
  FileCode2,
  BarChart3,
  Calendar,
  FolderOpen,
  MessageSquare,
  Building,
  History,
  HardDriveDownload,
  Settings,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useClass } from '../../contexts/ClassContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavSubItem {
  to: string;
  label: string;
  tab?: 'topics' | 'create' | 'list';
}

interface NavItem {
  to: string;
  label: string;
  icon: any;
  badge?: string;
  subItems?: NavSubItem[];
}

interface NavModuleGroup {
  id: string;
  title: string;
  items: NavItem[];
}

const TEACHER_GROUPS: NavModuleGroup[] = [
  {
    id: 'classes_group',
    title: 'LỚP HỌC',
    items: [
      { to: '/teacher/classes', label: 'Lớp của tôi', icon: BookOpen },
      { to: '/teacher/students', label: 'Học sinh', icon: Users },
      {
        to: '/teacher/attendance',
        label: 'Điểm danh',
        icon: Check,
        subItems: [
          { to: '/teacher/attendance', label: 'Điểm danh hằng ngày' },
          { to: '/teacher/reports', label: 'Báo cáo điểm danh' }
        ]
      },
      { to: '/teacher/schedule', label: 'Thời khóa biểu', icon: Calendar }
    ]
  },
  {
    id: 'academics_group',
    title: 'DẠY & HỌC',
    items: [
      { to: '/teacher/quizzes', label: 'Ngân hàng câu hỏi', icon: Database },
      {
        to: '/teacher/assignments',
        label: 'Giao bài tập',
        icon: FileCode2,
        badge: '4',
        subItems: [
          { to: '/teacher/assignments?tab=topics', label: 'Quản lý chủ đề', tab: 'topics' },
          { to: '/teacher/assignments?tab=create', label: 'Tạo bài tập', tab: 'create' },
          { to: '/teacher/assignments?tab=list', label: 'Danh sách bài tập đã giao', tab: 'list' }
        ]
      },
      { to: '/teacher/grades', label: 'Sổ điểm điện tử', icon: BarChart3 },
      { to: '/teacher/auto-grading', label: 'Chấm bài tự động', icon: CheckCircle2 },
      { to: '/teacher/resources', label: 'Tài liệu số', icon: FolderOpen },
      { to: '/teacher/ai', label: 'AI Hỗ trợ', icon: Sparkles }
    ]
  },
  {
    id: 'interactive_group',
    title: 'TƯƠNG TÁC & THI ĐUA',
    items: [
      { to: '/teacher/tools', label: 'Công cụ lớp học', icon: Dices },
      { to: '/teacher/behavior', label: 'Hành vi & Sao thi đua', icon: Award },
      { to: '/teacher/alerts', label: 'Cảnh báo thông minh', icon: ShieldAlert },
      { to: '/teacher/announcements', label: 'Bảng tin & Thông báo', icon: Bell }
    ]
  }
];

const STUDENT_GROUPS: NavModuleGroup[] = [
  {
    id: 'std_main',
    title: 'GÓC HỌC TẬP',
    items: [
      { to: '/student/schedule', label: 'Lịch học trong tuần', icon: Calendar },
      { to: '/student/assignments', label: 'Bài tập của em', icon: BookOpen },
      { to: '/student/quizzes', label: 'Kiểm tra trắc nghiệm', icon: Database },
      { to: '/student/grades', label: 'Bảng điểm & Xếp loại', icon: BarChart3 }
    ]
  },
  {
    id: 'std_resources',
    title: 'RÈN LUYỆN & HỌC LIỆU',
    items: [
      { to: '/student/attendance', label: 'Chuyên cần', icon: Check },
      { to: '/student/resources', label: 'Học liệu & Bài giảng', icon: FolderOpen },
      { to: '/student/notifications', label: 'Thông báo lớp', icon: Bell }
    ]
  }
];

const PARENT_GROUPS: NavModuleGroup[] = [
  {
    id: 'parent_main',
    title: 'THEO DÕI CON',
    items: [
      { to: '/parent/children', label: 'Hồ sơ học sinh', icon: GraduationCap },
      { to: '/parent/grades', label: 'Điểm số & Tiến độ', icon: BarChart3 },
      { to: '/parent/attendance', label: 'Chuyên cần & Vắng', icon: Check },
      { to: '/parent/messages', label: 'Trao đổi với GVCN', icon: MessageSquare },
      { to: '/parent/notifications', label: 'Thông báo nhà trường', icon: Bell }
    ]
  }
];

const ADMIN_GROUPS: NavModuleGroup[] = [
  {
    id: 'adm_management',
    title: 'QUẢN TRỊ HỆ THỐNG',
    items: [
      { to: '/admin/classes', label: 'Quản lý trường & Lớp', icon: Building },
      { to: '/admin/users', label: 'Quản lý Người dùng & RBAC', icon: Users },
      { to: '/admin/audit-logs', label: 'Nhật ký hệ thống (Audit)', icon: History },
      { to: '/admin/backups', label: 'Sao lưu & Phục hồi JSON', icon: HardDriveDownload },
      { to: '/admin/settings', label: 'Cấu hình hệ thống', icon: Settings }
    ]
  }
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { role } = useAuth();
  const { classes, selectedClass, selectedClassId, setSelectedClassId } = useClass();
  const location = useLocation();

  const currentGroups = useMemo(() => {
    if (role === 'student') return STUDENT_GROUPS;
    if (role === 'parent') return PARENT_GROUPS;
    if (role === 'admin') return ADMIN_GROUPS;
    return TEACHER_GROUPS;
  }, [role]);

  const dashboardPath =
    role === 'student'
      ? '/student/dashboard'
      : role === 'parent'
      ? '/parent/dashboard'
      : role === 'admin'
      ? '/admin/dashboard'
      : '/teacher/dashboard';

  // Mở sẵn nhóm LỚP HỌC và DẠY & HỌC như giao diện mẫu OmniClass
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    classes_group: true,
    academics_group: true,
    interactive_group: false,
    std_main: true,
    std_resources: true,
    parent_main: true,
    adm_management: true
  });

  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({
    '/teacher/attendance': true,
    '/teacher/assignments': true
  });

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const toggleSubMenu = (path: string) => {
    setOpenSubMenus((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-30 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-30 w-60 bg-[#050a12] text-slate-300 flex flex-col transition-transform duration-300 ease-in-out border-r border-cyan-500/20 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* CLASSROOM NODE Top Section */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider mb-1">
            <span className="text-cyan-400 font-bold">CLASSROOM NODE</span>
            <div className="flex items-center gap-2">
              <span className="text-rose-400 font-bold">{selectedClass?.studentCount || 32} HS</span>
              <button
                onClick={onClose}
                className="lg:hidden text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="relative">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-transparent text-sm font-extrabold text-white outline-none cursor-pointer pb-2 appearance-none"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#07111f] text-white">
                  Lớp {c.name}
                </option>
              ))}
            </select>
            <div className="h-[2px] w-full bg-slate-800 relative">
              <div className="absolute top-0 left-0 h-full w-2/5 bg-cyan-400 shadow-[0_0_8px_#00e5ff]" />
            </div>
          </div>
        </div>

        {/* Primary Overview Item (Tổng quan) with Cyan Slanted Right Edge */}
        <div className="px-3 mb-2">
          <NavLink
            to={dashboardPath}
            onClick={() => {
              if (window.innerWidth < 1024) onClose();
            }}
            className={({ isActive }) =>
              `omni-nav-slanted flex items-center gap-3 px-3.5 py-2.5 text-xs font-extrabold transition-all ${
                isActive
                  ? 'bg-[#00e5ff] text-slate-950 shadow-[0_0_20px_rgba(0,229,255,0.3)]'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
              }`
            }
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
            <span>Tổng quan</span>
          </NavLink>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-4">
          {currentGroups.map((group) => {
            const isGroupOpen = openGroups[group.id] ?? true;

            return (
              <div key={group.id} className="space-y-1">
                {/* Group Header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-[11px] font-mono font-bold uppercase tracking-widest text-cyan-400 hover:text-cyan-300 cursor-pointer"
                >
                  <span>{group.title}</span>
                  <div className="flex items-center gap-1 text-slate-400 font-mono text-[10px]">
                    <span>({group.items.length})</span>
                    {isGroupOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </div>
                </button>

                {/* Group Items */}
                {isGroupOpen && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const currentTab = new URLSearchParams(location.search).get('tab');
                      const isParentActive = location.pathname === item.to;
                      const isSubOpen = openSubMenus[item.to] ?? true;

                      return (
                        <div key={item.to}>
                          <div className="flex items-center justify-between">
                            <NavLink
                              to={item.to}
                              onClick={() => {
                                if (item.subItems) {
                                  toggleSubMenu(item.to);
                                } else if (window.innerWidth < 1024) {
                                  onClose();
                                }
                              }}
                              className={({ isActive }) =>
                                `flex-1 flex items-center justify-between px-2.5 py-2 text-xs font-medium transition-colors ${
                                  isActive && !item.subItems
                                    ? 'bg-cyan-950/60 text-cyan-300 font-bold border-l-2 border-cyan-400'
                                    : isActive
                                    ? 'text-white font-bold'
                                    : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
                                }`
                              }
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <item.icon className="w-4 h-4 text-cyan-400 shrink-0" />
                                <span className="truncate">{item.label}</span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {item.badge && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-rose-950/90 text-rose-400 border border-rose-500/40">
                                    {item.badge}
                                  </span>
                                )}
                                {item.subItems && (
                                  <ChevronDown
                                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                                      isSubOpen ? '' : '-rotate-90'
                                    }`}
                                  />
                                )}
                              </div>
                            </NavLink>
                          </div>

                          {/* Sub-items with vertical guide line */}
                          {item.subItems && isSubOpen && (
                            <div className="ml-4 pl-3 border-l border-slate-800 space-y-0.5 my-1">
                              {item.subItems.map((sub) => {
                                const isSubActive = sub.tab
                                  ? isParentActive &&
                                    (currentTab === sub.tab || (!currentTab && sub.tab === 'list'))
                                  : location.pathname === sub.to;

                                return (
                                  <NavLink
                                    key={sub.to}
                                    to={sub.to}
                                    onClick={() => {
                                      if (window.innerWidth < 1024) onClose();
                                    }}
                                    className={`block py-1.5 px-2 text-xs transition-colors ${
                                      isSubActive
                                        ? 'text-cyan-300 font-bold'
                                        : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                  >
                                    {sub.label}
                                  </NavLink>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom Brand Footer */}
        <div className="p-4 border-t border-cyan-500/15">
          <p className="text-xs font-mono font-bold text-slate-200">OmniClass</p>
          <p className="text-[10px] font-mono text-cyan-400 mt-0.5">
            AI-Powered Learning Management
          </p>
        </div>
      </aside>
    </>
  );
};


