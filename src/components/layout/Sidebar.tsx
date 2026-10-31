import React, { useState, useMemo, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck,
  Award,
  BookOpen,
  Sparkles,
  ShieldAlert,
  Dices,
  Bell,
  FileText,
  BarChart3,
  Calendar,
  Layers,
  FolderOpen,
  MessageSquare,
  Building,
  History,
  HardDriveDownload,
  Settings,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useClass } from '../../contexts/ClassContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: any;
  badge?: string;
  highlight?: boolean;
}

interface NavModuleGroup {
  id: string;
  title: string;
  icon: any;
  items: NavItem[];
}

const TEACHER_GROUPS: NavModuleGroup[] = [
  {
    id: 'core',
    title: 'Tổng quan & Bàn làm việc',
    icon: LayoutDashboard,
    items: [
      { to: '/teacher/dashboard', label: 'Bàn làm việc chính', icon: LayoutDashboard }
    ]
  },
  {
    id: 'classes_group',
    title: 'Lớp học & Học sinh',
    icon: Layers,
    items: [
      { to: '/teacher/classes', label: 'Quản lý danh sách lớp', icon: Layers },
      { to: '/teacher/students', label: 'Học sinh & Hồ sơ 360°', icon: GraduationCap },
      { to: '/teacher/attendance', label: 'Điểm danh thông minh', icon: CalendarCheck },
      { to: '/teacher/grades', label: 'Sổ điểm điện tử', icon: BarChart3 },
      { to: '/teacher/schedule', label: 'Thời khóa biểu', icon: Calendar }
    ]
  },
  {
    id: 'academics_group',
    title: 'Dạy & Học',
    icon: BookOpen,
    items: [
      { to: '/teacher/quizzes', label: 'Ngân hàng câu hỏi', icon: FileText },
      { to: '/teacher/assignments', label: 'Giao bài tập', icon: BookOpen },
      { to: '/teacher/auto-grading', label: 'Chấm bài tự động', icon: CheckCircle2 },
      { to: '/teacher/resources', label: 'Tài liệu số', icon: FolderOpen },
      { to: '/teacher/ai', label: 'AI Hỗ trợ', icon: Sparkles, badge: 'AI' }
    ]
  },
  {
    id: 'interactive_group',
    title: 'Tương tác & Thi đua',
    icon: Dices,
    items: [
      { to: '/teacher/tools', label: 'Công cụ lớp học', icon: Dices, highlight: true },
      { to: '/teacher/behavior', label: 'Hành vi & Sao thi đua', icon: Award },
      { to: '/teacher/alerts', label: 'Cảnh báo thông minh', icon: ShieldAlert },
      { to: '/teacher/announcements', label: 'Bảng tin & Thông báo', icon: Bell },
      { to: '/teacher/reports', label: 'Báo cáo & Thống kê', icon: TrendingUp }
    ]
  }
];

const STUDENT_GROUPS: NavModuleGroup[] = [
  {
    id: 'std_main',
    title: 'Góc học tập',
    icon: LayoutDashboard,
    items: [
      { to: '/student/dashboard', label: 'Cổng học sinh', icon: LayoutDashboard },
      { to: '/student/schedule', label: 'Lịch học trong tuần', icon: Calendar }
    ]
  },
  {
    id: 'std_assignments',
    title: 'Bài tập & Thi cử',
    icon: BookOpen,
    items: [
      { to: '/student/assignments', label: 'Bài tập của em', icon: BookOpen },
      { to: '/student/quizzes', label: 'Kiểm tra trắc nghiệm', icon: FileText },
      { to: '/student/grades', label: 'Bảng điểm & Xếp loại', icon: BarChart3 }
    ]
  },
  {
    id: 'std_resources',
    title: 'Rèn luyện & Học liệu',
    icon: FolderOpen,
    items: [
      { to: '/student/attendance', label: 'Chuyên cần', icon: CalendarCheck },
      { to: '/student/resources', label: 'Học liệu & Bài giảng', icon: FolderOpen },
      { to: '/student/notifications', label: 'Thông báo lớp', icon: Bell }
    ]
  }
];

const PARENT_GROUPS: NavModuleGroup[] = [
  {
    id: 'parent_main',
    title: 'Theo dõi con',
    icon: LayoutDashboard,
    items: [
      { to: '/parent/dashboard', label: 'Cổng phụ huynh', icon: LayoutDashboard },
      { to: '/parent/children', label: 'Hồ sơ học sinh', icon: GraduationCap }
    ]
  },
  {
    id: 'parent_progress',
    title: 'Tiến độ học tập',
    icon: BarChart3,
    items: [
      { to: '/parent/grades', label: 'Điểm số & Tiến độ', icon: BarChart3 },
      { to: '/parent/attendance', label: 'Chuyên cần & Vắng', icon: CalendarCheck }
    ]
  },
  {
    id: 'parent_connect',
    title: 'Gắn kết nhà trường',
    icon: MessageSquare,
    items: [
      { to: '/parent/messages', label: 'Trao đổi với GVCN', icon: MessageSquare },
      { to: '/parent/notifications', label: 'Thông báo nhà trường', icon: Bell }
    ]
  }
];

const ADMIN_GROUPS: NavModuleGroup[] = [
  {
    id: 'adm_core',
    title: 'Hệ thống Quản trị',
    icon: LayoutDashboard,
    items: [
      { to: '/admin/dashboard', label: 'Bảng điều khiển Admin', icon: LayoutDashboard }
    ]
  },
  {
    id: 'adm_management',
    title: 'Quản lý Cơ sở & Nhân sự',
    icon: Building,
    items: [
      { to: '/admin/classes', label: 'Quản lý trường & Lớp', icon: Building },
      { to: '/admin/users', label: 'Quản lý Người dùng & RBAC', icon: Users }
    ]
  },
  {
    id: 'adm_system',
    title: 'An toàn & Cấu hình',
    icon: Settings,
    items: [
      { to: '/admin/audit-logs', label: 'Nhật ký hệ thống (Audit)', icon: History },
      { to: '/admin/backups', label: 'Sao lưu & Phục hồi JSON', icon: HardDriveDownload },
      { to: '/admin/settings', label: 'Cấu hình hệ thống', icon: Settings }
    ]
  }
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { role } = useAuth();
  const { selectedClass } = useClass();
  const location = useLocation();
  const sidebarRef = useRef<HTMLElement | null>(null);

  // Pick group based on role with stable constant references
  const currentGroups = useMemo(() => {
    if (role === 'student') return STUDENT_GROUPS;
    if (role === 'parent') return PARENT_GROUPS;
    if (role === 'admin') return ADMIN_GROUPS;
    return TEACHER_GROUPS;
  }, [role]);

  // Chỉ lưu tối đa 1 nhóm đang mở (null = đóng tất cả)
  // Khi bấm vào nhóm khác, nhóm đã mở trước đó tự động tắt
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);

  const toggleGroup = (groupId: string) => {
    setOpenGroupId((prev) => (prev === groupId ? null : groupId));
  };

  // Tự động đóng tất cả tính năng khi thoát menu (trên mobile hoặc đổi vai trò)
  useEffect(() => {
    if (!isOpen) {
      setOpenGroupId(null);
    }
  }, [isOpen, role]);

  // Tự động đóng các tính năng khi click ra ngoài khu vực menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setOpenGroupId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleCloseMenu = () => {
    setOpenGroupId(null);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={handleCloseMenu}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container: Tự động đóng các tính năng khi thoát chuột khỏi menu */}
      <aside
        ref={sidebarRef}
        onMouseLeave={() => setOpenGroupId(null)}
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#080e1c] text-slate-300 flex flex-col transition-transform duration-300 ease-in-out border-r border-slate-800/80 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-cyan-500/20">
              SC
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
                SMART CLASS
              </h1>
              <p className="text-[11px] text-cyan-400 font-medium">Hệ thống Lớp học Thông minh</p>
            </div>
          </div>
          <button
            onClick={handleCloseMenu}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Header (Đã xóa nút Đóng/Mở tất cả và thẻ lớp trùng lặp với Header) */}
        <div className="px-4 pt-3 pb-1.5 flex items-center justify-between text-[11px] text-slate-500">
          <span className="font-semibold uppercase tracking-wider text-[10px]">Menu Chức Năng</span>
        </div>

        {/* Navigation Accordion Groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-2">
          {currentGroups.map((group) => {
            const isGroupOpen = openGroupId === group.id;
            const hasActiveChild = group.items.some((item) => location.pathname === item.to);

            return (
              <div key={group.id} className="rounded-xl overflow-hidden bg-[#0b1324]/60 border border-slate-800/40">
                {/* Header: Click mở nhóm hiện tại và tự động đóng nhóm trước đó */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    hasActiveChild
                      ? 'bg-slate-800/90 text-cyan-400 border border-cyan-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <group.icon className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="truncate">{group.title}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <span className="text-[10px] text-slate-500 font-normal">
                      {isGroupOpen ? 'Đóng' : `Mở (${group.items.length})`}
                    </span>
                    {isGroupOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 transition-transform" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 transition-transform" />
                    )}
                  </div>
                </button>

                {/* Sub-items (nested screens): Open/Close container */}
                {isGroupOpen && (
                  <div className="mt-1 pl-2 pr-1 pb-1.5 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150 border-l-2 border-slate-800 ml-3">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => {
                          if (window.innerWidth < 1024) handleCloseMenu();
                        }}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                            isActive
                              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold shadow-md shadow-cyan-950/50'
                              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                          }`
                        }
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <item.icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-amber-500 text-slate-950">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
          <span>THPT Chuyên Nguyễn Huệ</span>
          <span className="text-slate-400 font-mono">v2.6.0</span>
        </div>
      </aside>
    </>
  );
};

