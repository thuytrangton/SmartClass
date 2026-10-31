import React, { ReactNode } from 'react';
import { LucideIcon, AlertCircle, X } from 'lucide-react';

/* --- STAT CARD --- */
interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'indigo';
  change?: string;
  changePositive?: boolean;
  subtitle?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  color = 'blue',
  change,
  changePositive = true,
  subtitle,
  onClick
}) => {
  const colorMap = {
    blue: 'bg-cyan-950/70 text-cyan-400 border-cyan-800/50',
    purple: 'bg-purple-950/70 text-purple-400 border-purple-800/50',
    emerald: 'bg-emerald-950/70 text-emerald-400 border-emerald-800/50',
    amber: 'bg-amber-950/70 text-amber-400 border-amber-800/50',
    rose: 'bg-rose-950/70 text-rose-400 border-rose-800/50',
    indigo: 'bg-indigo-950/70 text-indigo-400 border-indigo-800/50'
  };

  return (
    <div
      onClick={onClick}
      className={`bg-[#0f172a] p-5 rounded-2xl border border-slate-800 shadow-lg hover:border-slate-700 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-cyan-500/40' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-400">{title}</span>
        <div className={`p-2.5 rounded-xl border ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-bold text-slate-100 tracking-tight">{value}</h3>
        {change && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
              changePositive
                ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/50'
                : 'bg-rose-950/70 text-rose-400 border-rose-800/50'
            }`}
          >
            {change}
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-slate-400 mt-1 font-normal">{subtitle}</p>}
    </div>
  );
};

/* --- PAGE HEADER --- */
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  children?: ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, badge, children }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-800">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">{title}</h1>
          {badge && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2.5 flex-wrap">{children}</div>}
    </div>
  );
};

/* --- EMPTY STATE --- */
interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = AlertCircle,
  actionText,
  onAction
}) => {
  return (
    <div className="text-center py-12 px-4 rounded-2xl bg-[#0f172a] border border-dashed border-slate-800">
      <div className="w-12 h-12 rounded-full bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-200">{title}</h3>
      <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-semibold rounded-xl shadow-md transition-colors cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

/* --- MODAL DIALOG --- */
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  children: ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  maxWidth = 'lg',
  children
}) => {
  if (!isOpen) return null;

  const widthMap = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className={`bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-800 w-full ${widthMap[maxWidth]} overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-100">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto text-slate-200">{children}</div>
      </div>
    </div>
  );
};

/* --- CONFIRM DIALOG --- */
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  isDanger = false
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
      <p className="text-sm text-slate-300 leading-relaxed">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {cancelText}
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-xs transition-colors cursor-pointer ${
            isDanger ? 'bg-rose-600 hover:bg-rose-500' : 'bg-cyan-600 hover:bg-cyan-500'
          }`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
};

/* --- STATUS CHIP --- */
interface StatusChipProps {
  status: string;
  label?: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, label }) => {
  const getStyle = () => {
    switch (status) {
      case 'present':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60';
      case 'late':
        return 'bg-amber-950/70 text-amber-300 border-amber-800/60';
      case 'excused':
        return 'bg-cyan-950/70 text-cyan-300 border-cyan-800/60';
      case 'unexcused':
        return 'bg-rose-950/70 text-rose-300 border-rose-800/60';
      case 'early_leave':
        return 'bg-purple-950/70 text-purple-300 border-purple-800/60';
      case 'active':
      case 'published':
      case 'graded':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60';
      case 'critical':
        return 'bg-rose-950/70 text-rose-300 border-rose-800/60';
      case 'warning':
        return 'bg-amber-950/70 text-amber-300 border-amber-800/60';
      case 'info':
        return 'bg-cyan-950/70 text-cyan-300 border-cyan-800/60';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getLabel = () => {
    if (label) return label;
    switch (status) {
      case 'present':
        return 'Có mặt';
      case 'late':
        return 'Đi muộn';
      case 'excused':
        return 'Có phép';
      case 'unexcused':
        return 'Không phép';
      case 'early_leave':
        return 'Về sớm';
      case 'active':
        return 'Đang hoạt động';
      case 'published':
        return 'Đã xuất bản';
      case 'graded':
        return 'Đã chấm điểm';
      case 'submitted':
        return 'Đã nộp bài';
      case 'critical':
        return 'Khẩn cấp';
      case 'warning':
        return 'Cảnh báo';
      case 'info':
        return 'Thông tin';
      default:
        return status;
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStyle()}`}>
      {getLabel()}
    </span>
  );
};

