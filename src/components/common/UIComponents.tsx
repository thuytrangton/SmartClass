import React, { ReactNode } from 'react';
import { LucideIcon, AlertCircle, X } from 'lucide-react';

export * from '../cyber/CyberUI';

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
    blue: 'bg-[#071824] text-[#00E5F0] border-[#00E5F0]/50',
    purple: 'bg-[#140E26] text-[#A45CFF] border-[#A45CFF]/50',
    emerald: 'bg-[#071D1A] text-[#18D9A0] border-[#18D9A0]/50',
    amber: 'bg-[#1D1B07] text-[#F5E900] border-[#F5E900]/50',
    rose: 'bg-[#220917] text-[#FF0066] border-[#FF0066]/50',
    indigo: 'bg-[#08152C] text-[#367CFF] border-[#367CFF]/50'
  };

  return (
    <div
      onClick={onClick}
      className={`omni-card p-5 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:bg-[#101827] hover:border-[#00E5F0]/50' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-[#96A3B8]">{title}</span>
        <div className={`omni-icon-box w-9 h-9 flex items-center justify-center border ${colorMap[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <h3 className="text-[36px] leading-none font-extrabold font-mono text-[#F4F6FB] tracking-tight">
          {value}
        </h3>
        {change && (
          <span
            className={`text-xs font-mono font-bold ${
              changePositive ? 'text-[#18D9A0]' : 'text-[#FF0066]'
            }`}
          >
            {change}
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-[#96A3B8] mt-3 font-normal">{subtitle}</p>}
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
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-[#164452]">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-extrabold text-[#F4F6FB] tracking-tight">{title}</h1>
          {badge && (
            <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-mono font-bold bg-[#071824] text-[#00E5F0] border border-[#00E5F0]/50 whitespace-nowrap shrink-0">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="text-sm text-[#96A3B8] mt-1">{subtitle}</p>}
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
    <div className="text-center py-12 px-4 omni-card">
      <div className="w-12 h-12 bg-[#050811] border border-[#164452] text-[#00E5F0] flex items-center justify-center mx-auto mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-[#F4F6FB]">{title}</h3>
      <p className="text-sm text-[#96A3B8] mt-1 max-w-sm mx-auto leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 omni-btn-slanted inline-flex items-center gap-2 px-4 py-2 bg-[#00E5F0] hover:bg-[#33ECFF] text-[#03060D] text-xs font-extrabold transition-colors cursor-pointer"
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className={`omni-card shadow-2xl w-full ${widthMap[maxWidth]} overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[#164452]">
          <div>
            <h3 className="text-lg font-bold text-[#F4F6FB]">{title}</h3>
            {subtitle && <p className="text-xs text-[#96A3B8] mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#96A3B8] hover:text-[#00E5F0] hover:bg-[#101827] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto text-[#F4F6FB]">{children}</div>
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
      <p className="text-sm text-[#96A3B8] leading-relaxed">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-[#164452] text-xs font-semibold text-[#96A3B8] hover:text-[#F4F6FB] hover:bg-[#101827] transition-colors cursor-pointer"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`px-4 py-2 text-xs font-extrabold transition-colors cursor-pointer ${
            isDanger
              ? 'bg-[#FF0066] hover:bg-[#FF3385] text-white'
              : 'bg-[#00E5F0] hover:bg-[#33ECFF] text-[#03060D] omni-btn-slanted'
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
      case 'active':
      case 'published':
      case 'graded':
        return 'bg-[#071D1A] text-[#18D9A0] border-[#18D9A0]/50';
      case 'submitted':
      case 'excused':
      case 'info':
        return 'bg-[#071824] text-[#00E5F0] border-[#00E5F0]/50';
      case 'late':
      case 'warning':
      case 'redo_requested':
        return 'bg-[#1D1B07] text-[#F5E900] border-[#F5E900]/50';
      case 'unexcused':
      case 'critical':
      case 'closed':
        return 'bg-[#220917] text-[#FF0066] border-[#FF0066]/50';
      case 'early_leave':
        return 'bg-[#140E26] text-[#A45CFF] border-[#A45CFF]/50';
      case 'draft':
      case 'pending':
      case 'missing':
      default:
        return 'bg-[#050811] text-[#96A3B8] border-[#164452]';
    }
  };

  const getLabel = () => {
    if (label) return label;
    switch (status) {
      case 'present':
        return 'Có mặt';
      case 'late':
        return 'Nộp muộn';
      case 'excused':
        return 'Có phép';
      case 'unexcused':
        return 'Không phép';
      case 'early_leave':
        return 'Về sớm';
      case 'active':
        return 'Đang hoạt động';
      case 'published':
        return 'Đang giao';
      case 'draft':
        return 'Bản nháp';
      case 'closed':
        return 'Hết hạn';
      case 'graded':
        return 'Đã chấm';
      case 'submitted':
        return 'Đã nộp';
      case 'redo_requested':
        return 'Yêu cầu làm lại';
      case 'pending':
      case 'missing':
        return 'Chưa làm';
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
    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-mono font-bold border ${getStyle()}`}>
      {getLabel()}
    </span>
  );
};
