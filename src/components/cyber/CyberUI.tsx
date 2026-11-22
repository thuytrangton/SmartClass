import React, { ReactNode } from 'react';
import {
  LucideIcon,
  Home,
  ChevronRight,
  ArrowRight,
  X,
  AlertCircle,
  Target,
  Users
} from 'lucide-react';

export type CyberAccentColor = 'cyan' | 'green' | 'purple' | 'blue' | 'yellow' | 'magenta';

const ACCENT_MAP: Record<
  CyberAccentColor,
  {
    text: string;
    border: string;
    hoverBorder: string;
    bgBox: string;
    boxBorder: string;
    dotBg: string;
    topBorder: string;
  }
> = {
  cyan: {
    text: 'text-[#00E5F0]',
    border: 'border-[#00E5F0]/35',
    hoverBorder: 'hover:border-[#00E5F0]',
    bgBox: 'bg-[#071824]',
    boxBorder: 'border-[#00E5F0]/50',
    dotBg: 'bg-[#00E5F0]',
    topBorder: 'border-t-[#00E5F0]'
  },
  green: {
    text: 'text-[#18D9A0]',
    border: 'border-[#18D9A0]/35',
    hoverBorder: 'hover:border-[#18D9A0]',
    bgBox: 'bg-[#071D1A]',
    boxBorder: 'border-[#18D9A0]/50',
    dotBg: 'bg-[#18D9A0]',
    topBorder: 'border-t-[#18D9A0]'
  },
  purple: {
    text: 'text-[#A45CFF]',
    border: 'border-[#A45CFF]/35',
    hoverBorder: 'hover:border-[#A45CFF]',
    bgBox: 'bg-[#140E26]',
    boxBorder: 'border-[#A45CFF]/50',
    dotBg: 'bg-[#A45CFF]',
    topBorder: 'border-t-[#A45CFF]'
  },
  blue: {
    text: 'text-[#367CFF]',
    border: 'border-[#367CFF]/35',
    hoverBorder: 'hover:border-[#367CFF]',
    bgBox: 'bg-[#08152C]',
    boxBorder: 'border-[#367CFF]/50',
    dotBg: 'bg-[#367CFF]',
    topBorder: 'border-t-[#367CFF]'
  },
  yellow: {
    text: 'text-[#F5E900]',
    border: 'border-[#F5E900]/35',
    hoverBorder: 'hover:border-[#F5E900]',
    bgBox: 'bg-[#1D1B07]',
    boxBorder: 'border-[#F5E900]/50',
    dotBg: 'bg-[#F5E900]',
    topBorder: 'border-t-[#F5E900]'
  },
  magenta: {
    text: 'text-[#FF0066]',
    border: 'border-[#FF0066]/35',
    hoverBorder: 'hover:border-[#FF0066]',
    bgBox: 'bg-[#220917]',
    boxBorder: 'border-[#FF0066]/50',
    dotBg: 'bg-[#FF0066]',
    topBorder: 'border-t-[#FF0066]'
  }
};

/* --- 1. CYBER PANEL --- */
export interface CyberPanelProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const CyberPanel: React.FC<CyberPanelProps> = ({
  children,
  className = '',
  onClick,
  hoverable = false
}) => {
  return (
    <div
      onClick={onClick}
      className={`omni-card transition-colors duration-200 ${
        onClick || hoverable ? 'cursor-pointer hover:bg-[#101827] hover:border-[#00E5F0]/50' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

/* --- 2. CYBER BUTTON --- */
export interface CyberButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'danger' | 'ghost';
  slanted?: boolean;
  icon?: LucideIcon;
  iconClassName?: string;
}

export const CyberButton: React.FC<CyberButtonProps> = ({
  children,
  variant = 'primary',
  slanted = false,
  icon: Icon,
  iconClassName = '',
  className = '',
  ...props
}) => {
  const variantClasses = {
    primary:
      'bg-[#00E5F0] hover:bg-[#33ECFF] text-[#03060D] font-extrabold shadow-[0_0_20px_rgba(0,229,240,0.28)]',
    outline:
      'bg-[#090D18] hover:bg-[#101827] border border-[#164452] hover:border-[#00E5F0]/60 text-[#F4F6FB] font-bold',
    danger:
      'bg-[#220917] hover:bg-[#FF0066] text-[#FF0066] hover:text-white border border-[#FF0066]/50 font-bold',
    ghost: 'bg-transparent hover:bg-[#101827] text-[#96A3B8] hover:text-[#F4F6FB] font-semibold'
  };

  return (
    <button
      type="button"
      className={`${slanted ? 'omni-btn-slanted' : ''} px-4 py-2.5 text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {Icon && <Icon className={`w-4 h-4 shrink-0 ${iconClassName}`} />}
      <span>{children}</span>
    </button>
  );
};

/* --- 3. CYBER BADGE --- */
export interface CyberBadgeProps {
  children: ReactNode;
  color?: CyberAccentColor;
  className?: string;
}

export const CyberBadge: React.FC<CyberBadgeProps> = ({
  children,
  color = 'cyan',
  className = ''
}) => {
  const accent = ACCENT_MAP[color];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border ${accent.bgBox} ${accent.text} ${accent.boxBorder} ${className}`}
    >
      {children}
    </span>
  );
};

/* --- 4. BREADCRUMB --- */
export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

export const Breadcrumb: React.FC<{ items: BreadcrumbItem[] }> = ({ items }) => {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-mono text-[#00E5F0]">
      <Home className="w-3.5 h-3.5 text-[#00E5F0] shrink-0" />
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            <ChevronRight className="w-3 h-3 text-[#164452] shrink-0" />
            {item.onClick && !isLast ? (
              <button
                type="button"
                onClick={item.onClick}
                className="text-[#96A3B8] hover:text-[#00E5F0] transition-colors cursor-pointer"
              >
                {item.label}
              </button>
            ) : (
              <span className={isLast ? 'text-[#00E5F0]' : 'text-[#96A3B8]'}>{item.label}</span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

/* --- 5. KPI STAT CARD --- */
export interface CyberStatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  badgeText?: string;
  icon: LucideIcon;
  accent?: CyberAccentColor;
  onClick?: () => void;
}

export const CyberStatCard: React.FC<CyberStatCardProps> = ({
  title,
  value,
  subtitle,
  badgeText,
  icon: Icon,
  accent = 'cyan',
  onClick
}) => {
  const style = ACCENT_MAP[accent];

  return (
    <CyberPanel onClick={onClick} hoverable className="p-5 flex flex-col justify-between min-h-[148px]">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-medium text-[#96A3B8] truncate">{title}</span>
        <div
          className={`omni-icon-box w-9 h-9 ${style.bgBox} border ${style.boxBorder} flex items-center justify-center ${style.text} shrink-0`}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="my-2 flex items-baseline gap-2.5 flex-wrap">
        <span className="text-[38px] leading-none font-extrabold font-mono text-[#F4F6FB] tracking-tight">
          {value}
        </span>
        {badgeText && (
          <span className={`text-xs font-mono font-bold ${style.text}`}>{badgeText}</span>
        )}
      </div>

      <p className="text-xs text-[#96A3B8] truncate">{subtitle}</p>
    </CyberPanel>
  );
};

/* --- 6. QUICK ACTION CARD --- */
export interface QuickActionCardProps {
  label: string;
  icon: LucideIcon;
  accent: CyberAccentColor;
  onClick: () => void;
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({
  label,
  icon: Icon,
  accent,
  onClick
}) => {
  const style = ACCENT_MAP[accent];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`bg-[#050811] hover:bg-[#101827] border ${style.border} ${style.hoverBorder} p-4 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group`}
    >
      <div
        className={`omni-icon-box w-9 h-10 ${style.bgBox} border ${style.boxBorder} flex items-center justify-center group-hover:scale-105 transition-transform`}
      >
        <Icon className={`w-4 h-4 ${style.text}`} />
      </div>
      <span className="text-xs font-bold text-[#F4F6FB] tracking-tight">{label}</span>
    </button>
  );
};

/* --- 7. SECTION HEADER --- */
export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, actionLabel, onAction }) => {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-base font-extrabold text-[#F4F6FB] tracking-tight">{title}</h2>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="text-xs font-mono font-bold text-[#00E5F0] hover:text-[#33ECFF] flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <span>{actionLabel}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

/* --- 8. CLASS CARD --- */
export interface ClassCardProps {
  name: string;
  gradeLevel: number;
  roomNumber: string;
  homeroomTeacherName: string;
  studentCount?: number;
  accent?: 'blue' | 'purple' | 'cyan';
  onClick?: () => void;
}

export const ClassCard: React.FC<ClassCardProps> = ({
  name,
  gradeLevel,
  roomNumber,
  homeroomTeacherName,
  studentCount,
  accent = 'blue',
  onClick
}) => {
  const topBorder =
    accent === 'purple'
      ? 'border-t-[#A45CFF]'
      : accent === 'cyan'
      ? 'border-t-[#00E5F0]'
      : 'border-t-[#367CFF]';

  const dotColor =
    accent === 'purple'
      ? 'bg-[#A45CFF]'
      : accent === 'cyan'
      ? 'bg-[#00E5F0]'
      : 'bg-[#367CFF]';

  return (
    <div
      onClick={onClick}
      className={`omni-card p-5 border-t-2 ${topBorder} cursor-pointer hover:bg-[#101827] transition-all flex flex-col justify-between`}
    >
      <div>
        <div className="flex items-center justify-between text-xs font-mono text-[#96A3B8] mb-2">
          <span>
            Khối {gradeLevel} · Phòng {roomNumber}
          </span>
          <span className={`w-2.5 h-2.5 ${dotColor}`} />
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-xl font-extrabold text-[#F4F6FB]">
            {name.startsWith('Lớp') ? name : `Lớp ${name}`}
          </h3>
          {typeof studentCount === 'number' && (
            <span className="text-[11px] font-mono text-[#00E5F0] flex items-center gap-1">
              <Users className="w-3 h-3" /> {studentCount} HS
            </span>
          )}
        </div>
        <p className="text-xs text-[#96A3B8] mt-2">
          GVCN: <strong className="text-[#F4F6FB]">{homeroomTeacherName}</strong>
        </p>
      </div>
    </div>
  );
};

/* --- 9. SMART ALERT PANEL --- */
export interface SmartAlertItem {
  id: string;
  studentName: string;
  className: string;
  severityLabel: string;
  isCritical?: boolean;
  description: string;
}

export interface SmartAlertPanelProps {
  count: number;
  items: SmartAlertItem[];
  onSelectAlert: (id: string) => void;
}

export const SmartAlertPanel: React.FC<SmartAlertPanelProps> = ({
  count,
  items,
  onSelectAlert
}) => {
  return (
    <CyberPanel className="p-5 h-full flex flex-col justify-between space-y-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Target className="w-5 h-5 text-[#FF0066] shrink-0" />
            <h3 className="text-sm font-extrabold text-[#F4F6FB] leading-tight">
              Cảnh báo thông minh
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-[#FF0066] shrink-0">
            {count} việc cần làm
          </span>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectAlert(item.id)}
              className="p-3.5 bg-[#050811] border border-[#164452] hover:border-[#FF0066]/50 hover:bg-[#101827] cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-bold text-[#F4F6FB]">
                  {item.studentName} ({item.className})
                </span>
                <span
                  className={`text-[10px] font-mono font-bold uppercase ${
                    item.isCritical ? 'text-[#FF0066]' : 'text-[#F5E900]'
                  }`}
                >
                  {item.severityLabel}
                </span>
              </div>
              <p className="text-xs text-[#96A3B8] line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </CyberPanel>
  );
};

/* --- 10. FORM CONTROLS (CyberInput, CyberSelect, CyberTextarea) --- */
export const CyberInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
  className = '',
  ...props
}) => (
  <input
    className={`w-full px-3.5 py-2 bg-[#050811] border border-[#164452] focus:border-[#00E5F0] text-xs text-[#F4F6FB] placeholder:text-[#96A3B8] outline-none transition-colors ${className}`}
    {...props}
  />
);

export const CyberSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <select
    className={`px-3.5 py-2 bg-[#050811] border border-[#164452] focus:border-[#00E5F0] text-xs font-semibold text-[#F4F6FB] outline-none cursor-pointer transition-colors ${className}`}
    {...props}
  >
    {children}
  </select>
);

export const CyberTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
  className = '',
  ...props
}) => (
  <textarea
    className={`w-full px-3.5 py-2.5 bg-[#050811] border border-[#164452] focus:border-[#00E5F0] text-xs text-[#F4F6FB] placeholder:text-[#96A3B8] outline-none transition-colors ${className}`}
    {...props}
  />
);

/* --- 11. CYBER MODAL --- */
export interface CyberModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  children: ReactNode;
}

export const CyberModal: React.FC<CyberModalProps> = ({
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
        className={`omni-card w-full ${widthMap[maxWidth]} overflow-hidden shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[#164452]">
          <div>
            <h3 className="text-base font-extrabold text-[#F4F6FB] uppercase tracking-wide font-mono">
              {title}
            </h3>
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

/* --- 12. CYBER TABS --- */
export interface CyberTabItem {
  id: string;
  label: string;
  badge?: number | string;
}

export const CyberTabs: React.FC<{
  tabs: CyberTabItem[];
  activeTab: string;
  onChange: (id: string) => void;
}> = ({ tabs, activeTab, onChange }) => (
  <div className="flex items-center gap-2 border-b border-[#164452] pb-2 flex-wrap">
    {tabs.map((tab) => {
      const active = tab.id === activeTab;
      return (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            active
              ? 'bg-[#00E5F0] text-[#03060D] omni-btn-slanted'
              : 'bg-[#090D18] text-[#96A3B8] hover:text-[#F4F6FB] border border-[#164452]'
          }`}
        >
          <span>{tab.label}</span>
          {tab.badge !== undefined && (
            <span
              className={`px-1.5 py-0.2 text-[10px] ${
                active ? 'bg-[#03060D] text-[#00E5F0]' : 'bg-[#101827] text-[#00E5F0]'
              }`}
            >
              {tab.badge}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

/* --- 13. LOADING SKELETON & EMPTY STATE --- */
export const LoadingSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="h-16 bg-[#090D18] border border-[#164452] animate-pulse flex items-center justify-between px-4"
      >
        <div className="h-3 w-1/3 bg-[#164452]" />
        <div className="h-3 w-16 bg-[#164452]" />
      </div>
    ))}
  </div>
);

export const CyberEmptyState: React.FC<{
  title: string;
  description: string;
  icon?: LucideIcon;
  actionText?: string;
  onAction?: () => void;
}> = ({ title, description, icon: Icon = AlertCircle, actionText, onAction }) => (
  <CyberPanel className="py-12 px-4 text-center">
    <div className="w-12 h-12 bg-[#050811] border border-[#164452] text-[#00E5F0] flex items-center justify-center mx-auto mb-3">
      <Icon className="w-6 h-6" />
    </div>
    <h3 className="text-sm font-bold text-[#F4F6FB] uppercase font-mono">{title}</h3>
    <p className="text-xs text-[#96A3B8] mt-1 max-w-sm mx-auto">{description}</p>
    {actionText && onAction && (
      <div className="mt-4 flex justify-center">
        <CyberButton onClick={onAction} slanted>
          {actionText}
        </CyberButton>
      </div>
    )}
  </CyberPanel>
);
