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
  ChevronsLeft,
  ChevronsRight,
  PanelLeftClose,
  CheckCircle2,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useClass } from '../../contexts/ClassContext';

interface SidebarProps {
  isOpen: boolean;
  isDesktopOpen?: boolean;
  onClose: () => void;
  onToggleDesktop?: () => void;
  onCollapseAll?: () => void;
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
  countLabel?: number;
  items: NavItem[];
}

const TEACHER_GROUPS: NavModuleGroup[] = [
  {
    id: 'classes_group',
    title: 'LỚP HỌC',
    countLabel: 4,
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
    countLabel: 5,
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

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  isDesktopOpen = true,
  onClose,
  onToggleDesktop,
  onCollapseAll
}) => {
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

  // 1. Mặc định menu đóng khi vừa mở Sidebar hoặc tải lại trang (tất cả nhóm chức năng thu gọn)
  // 2. Quản lý trạng thái độc lập: chỉ mở tối đa 1 nhóm chức năng (activeGroupId) và 1 chức năng con (activeSubMenuPath)
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeSubMenuPath, setActiveSubMenuPath] = useState<string | null>(null);

  // 3. Tự động đóng toàn bộ chức năng/nhóm đang mở khi đóng/thoát Sidebar (trên Mobile, Tablet hoặc Desktop) hoặc khi đổi Role
  React.useEffect(() => {
    if (!isOpen) {
      setActiveGroupId(null);
      setActiveSubMenuPath(null);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (!isDesktopOpen) {
      setActiveGroupId(null);
      setActiveSubMenuPath(null);
    }
  }, [isDesktopOpen]);

  React.useEffect(() => {
    setActiveGroupId(null);
    setActiveSubMenuPath(null);
  }, [role]);

  // Khi bấm vào một nhóm menu: thu gọn nhóm cũ ngay lập tức, mở nhóm mới (hoặc thu gọn nếu đang mở), đồng thời tắt chức năng con bên trong
  const toggleGroup = (groupId: string) => {
    setActiveSubMenuPath(null);
    setActiveGroupId((prev) => (prev === groupId ? null : groupId));
  };

  // Khi bấm vào một chức năng trong nhóm: tự động đóng chức năng cũ và chỉ hiển thị chức năng mới được chọn
  const handleFunctionClick = (item: NavItem, groupId: string, e: React.MouseEvent) => {
    setActiveGroupId(groupId);
    if (item.subItems && item.subItems.length > 0) {
      if (activeSubMenuPath === item.to) {
        e.preventDefault();
        setActiveSubMenuPath(null);
      } else {
        setActiveSubMenuPath(item.to);
      }
    } else {
      setActiveSubMenuPath(null);
      if (window.innerWidth < 1024) {
        onClose();
      }
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={() => {
            setActiveGroupId(null);
            setActiveSubMenuPath(null);
            onClose();
          }}
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-30 lg:hidden"
        />
      )}

      {/* Docked Desktop Toggle Icon Button on Left Edge / Sidebar Edge to Close or Open Left Menu */}
      {onToggleDesktop && (
        <button
          type="button"
          onClick={() => {
            if (isDesktopOpen) {
              setActiveGroupId(null);
              setActiveSubMenuPath(null);
            }
            onToggleDesktop();
          }}
          title={isDesktopOpen ? 'Thu gọn menu trái để mở rộng nội dung' : 'Mở lại menu trái'}
          aria-label={isDesktopOpen ? 'Thu gọn menu trái' : 'Mở menu trái'}
          className={`hidden lg:flex fixed top-[84px] z-40 items-center justify-center w-7 h-11 rounded-r-xl bg-[#071824] border border-l-0 border-[#00E5F0]/50 text-[#00E5F0] hover:bg-[#00E5F0] hover:text-[#03060D] shadow-[0_0_16px_rgba(0,229,240,0.22)] transition-all duration-300 ease-in-out cursor-pointer ${
            isDesktopOpen ? 'left-[272px] xl:left-[308px]' : 'left-0'
          }`}
        >
          {isDesktopOpen ? (
            <ChevronsLeft className="w-4 h-4" />
          ) : (
            <ChevronsRight className="w-4 h-4" />
          )}
        </button>
      )}

      {/* Sidebar Container (308px on xl desktop, #04070E surface) */}
      <aside
        className={`fixed top-[70px] bottom-0 left-0 z-30 w-[280px] lg:w-[272px] xl:w-[308px] bg-[#04070E] text-[#96A3B8] flex flex-col transition-transform duration-300 ease-in-out border-r border-[#164452] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isDesktopOpen ? 'lg:translate-x-0' : 'lg:-translate-x-full'}`}
      >
        {/* CLASSROOM NODE Top Section */}
        <div className="px-5 pt-5 pb-3.5">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider mb-1">
            <span className="text-[#00E5F0] font-bold">CLASSROOM NODE</span>
            <div className="flex items-center gap-2">
              <span className="text-[#FF0066] font-bold">{selectedClass?.studentCount || 32} HS</span>
              {/* Nút đóng/thu gọn menu trái ngay trong góc phải trên của Sidebar */}
              <button
                type="button"
                onClick={() => {
                  setActiveGroupId(null);
                  setActiveSubMenuPath(null);
                  if (onCollapseAll) {
                    onCollapseAll();
                  } else {
                    onClose();
                  }
                }}
                title="Đóng menu trái để tăng diện tích nội dung"
                className="flex items-center justify-center text-[#00E5F0] hover:text-[#03060D] hover:bg-[#00E5F0] bg-[#071824] border border-[#164452] hover:border-[#00E5F0] p-1.5 rounded-lg transition-all cursor-pointer"
              >
                <PanelLeftClose className="w-3.5 h-3.5 hidden lg:block" />
                <X className="w-3.5 h-3.5 lg:hidden" />
              </button>
            </div>
          </div>

          <div className="relative">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-transparent text-base font-extrabold text-[#F4F6FB] outline-none cursor-pointer pb-2 appearance-none"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#090D18] text-[#F4F6FB]">
                  Lớp {c.name}
                </option>
              ))}
            </select>
            <div className="h-[2px] w-full bg-[#164452]/60 rounded-full relative overflow-hidden">
              <div className="absolute top-0 left-0 h-full w-2/5 bg-[#00E5F0] rounded-full shadow-[0_0_8px_#00E5F0]" />
            </div>
          </div>
        </div>

        {/* Primary Overview Item (Tổng quan) - Bo tròn; khi chọn sẽ tự động đóng các nhóm/chức năng khác */}
        <div className="px-4 mb-2.5">
          <NavLink
            to={dashboardPath}
            onClick={() => {
              setActiveGroupId(null);
              setActiveSubMenuPath(null);
              if (window.innerWidth < 1024) onClose();
            }}
            className={({ isActive }) =>
              `rounded-2xl flex items-center gap-3 px-4 py-3 text-xs font-extrabold transition-all ${
                isActive
                  ? 'bg-[#00E5F0] text-[#03060D] shadow-[0_0_20px_rgba(0,229,240,0.3)]'
                  : 'text-[#96A3B8] hover:text-[#F4F6FB] hover:bg-[#101827]'
              }`
            }
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
            <span>Tổng quan</span>
          </NavLink>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto px-4 py-1 space-y-3">
          {currentGroups.map((group) => {
            const isGroupOpen = activeGroupId === group.id;

            return (
              <div key={group.id} className="space-y-1.5">
                {/* Group Header - Bo tròn */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[11px] font-mono font-bold uppercase tracking-[0.16em] transition-all cursor-pointer ${
                    isGroupOpen
                      ? 'bg-[#091322] text-[#00E5F0] border border-[#164452]'
                      : 'text-[#00E5F0] hover:text-[#33ECFF] hover:bg-[#101827]/60 border border-transparent'
                  }`}
                >
                  <span>{group.title}</span>
                  <div className="flex items-center gap-1 text-[#96A3B8] font-mono text-[11px]">
                    <span>({group.countLabel ?? group.items.length})</span>
                    {isGroupOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-[#00E5F0]" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-[#96A3B8]" />
                    )}
                  </div>
                </button>

                {/* Group Items */}
                {isGroupOpen && (
                  <div className="space-y-1 pl-1">
                    {group.items.map((item) => {
                      const currentTab = new URLSearchParams(location.search).get('tab');
                      const isParentActive = location.pathname === item.to;
                      const isSubOpen = activeSubMenuPath === item.to;

                      return (
                        <div key={item.to} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <NavLink
                              to={item.to}
                              onClick={(e) => handleFunctionClick(item, group.id, e)}
                              className={({ isActive }) =>
                                `flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                                  isActive && !item.subItems
                                    ? 'bg-[#101827] text-[#00E5F0] font-bold border border-[#00E5F0]/40 shadow-[0_0_12px_rgba(0,229,240,0.12)]'
                                    : isActive || isSubOpen
                                    ? 'bg-[#091322] text-[#F4F6FB] font-bold border border-[#164452]'
                                    : 'text-[#96A3B8] hover:text-[#F4F6FB] hover:bg-[#101827]/80 border border-transparent'
                                }`
                              }
                            >
                              <div className="flex items-center gap-3 truncate">
                                <item.icon className="w-4 h-4 text-[#00E5F0] shrink-0" />
                                <span className="truncate">{item.label}</span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {item.badge && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#220917] text-[#FF0066] border border-[#FF0066]/40">
                                    {item.badge}
                                  </span>
                                )}
                                {item.subItems && (
                                  <ChevronDown
                                    className={`w-3.5 h-3.5 text-[#96A3B8] transition-transform duration-200 ${
                                      isSubOpen ? '' : '-rotate-90'
                                    }`}
                                  />
                                )}
                              </div>
                            </NavLink>
                          </div>

                          {/* Sub-items bo tròn */}
                          {item.subItems && isSubOpen && (
                            <div className="ml-4 pl-3 border-l border-[#164452] space-y-1 my-1">
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
                                      setActiveGroupId(group.id);
                                      setActiveSubMenuPath(item.to);
                                      if (window.innerWidth < 1024) onClose();
                                    }}
                                    className={`block py-2 px-3 rounded-xl text-xs transition-all ${
                                      isSubActive
                                        ? 'bg-[#071824] text-[#00E5F0] font-bold border border-[#00E5F0]/35'
                                        : 'text-[#96A3B8] hover:text-[#F4F6FB] hover:bg-[#101827]/70 border border-transparent'
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
        <div className="p-5 border-t border-[#164452]">
          <p className="text-xs font-mono font-bold text-[#F4F6FB]">Sigma</p>
          <p className="text-[11px] font-mono text-[#00E5F0] mt-0.5">
            AI-Powered Learning Management
          </p>
        </div>
      </aside>
    </>
  );
};
