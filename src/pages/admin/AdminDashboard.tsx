import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building,
  Users,
  Layers,
  GraduationCap,
  History,
  HardDriveDownload,
  Shield,
  CheckCircle2,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { db } from '../../services/db';
import { PageHeader, StatCard } from '../../components/common/UIComponents';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const school = db.getSchool();
  const classes = db.getClasses();
  const students = db.getStudents();
  const auditLogs = db.getAuditLogs();
  const alerts = db.getAlerts();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bảng điều khiển Quản trị - ${school.name}`}
        subtitle={`Mã trường: ${school.code} • Hiệu trưởng: ${school.principal} • Năm học: ${school.academicYear}`}
        badge="Admin Portal"
      />

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tổng số Học sinh"
          value={`${students.length} em`}
          icon={GraduationCap}
          color="blue"
          subtitle={`Phân bổ trong ${classes.length} lớp học`}
          onClick={() => navigate('/teacher/students')}
        />
        <StatCard
          title="Tổng số Lớp học"
          value={`${classes.length} lớp`}
          icon={Layers}
          color="emerald"
          subtitle="Khối 10, 11, 12"
          onClick={() => navigate('/teacher/classes')}
        />
        <StatCard
          title="Cảnh báo cần theo dõi"
          value={alerts.length}
          icon={AlertTriangle}
          color={alerts.length > 0 ? 'rose' : 'emerald'}
          subtitle="Chuyên cần & Học lực"
          onClick={() => navigate('/teacher/alerts')}
        />
        <StatCard
          title="Nhật ký Audit hệ thống"
          value={`${auditLogs.length} sự kiện`}
          icon={History}
          color="purple"
          subtitle="Ghi nhận bảo mật ISO"
          onClick={() => navigate('/admin/audit-logs')}
        />
      </div>

      {/* Multi-school / Center Foundation Card */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
              <Building className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="font-black text-base">Kiến trúc Nền tảng Đa trường (Multi-school Architecture)</h3>
              <p className="text-xs text-slate-300">
                Hệ sinh thái Smart Class sẵn sàng mở rộng quy mô SaaS cho hàng trăm trường học và trung tâm
              </p>
            </div>
          </div>
          <span className="text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-3 py-1 rounded-full">
            Tenant Active: {school.code}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs text-slate-300">
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
            <strong className="text-white block mb-1">Cô lập dữ liệu RLS:</strong>
            Mỗi trường có phân vùng dữ liệu riêng biệt đảm bảo an toàn tuyệt đối.
          </div>
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
            <strong className="text-white block mb-1">Phân quyền 4 cấp:</strong>
            Admin toàn trường, Giáo viên bộ môn & chủ nhiệm, Học sinh, Phụ huynh.
          </div>
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
            <strong className="text-white block mb-1">Kiểm toán Audit Log:</strong>
            Toàn bộ thao tác sửa điểm, nhập dữ liệu được ghi nhận IP và thời gian.
          </div>
        </div>
      </div>

      {/* Recent Audit Logs & System Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-purple-600" />
              Nhật ký Hoạt động Quản trị gần nhất
            </h4>
            <button
              onClick={() => navigate('/admin/audit-logs')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800"
            >
              Xem toàn bộ →
            </button>
          </div>

          <div className="space-y-3">
            {auditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>{log.action}</span>
                  <span className="text-slate-400 font-mono text-[10px]">{log.timestamp}</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">{log.details}</p>
                <div className="mt-2 flex items-center gap-4 text-[10px] text-slate-400">
                  <span>Thực hiện: {log.userName} ({log.userRole})</span>
                  <span>IP: {log.ipAddress}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-5">
          {/* Quick Admin Actions */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <h4 className="font-extrabold text-sm text-slate-900">Thao tác Quản trị Nhanh</h4>
            <button
              onClick={() => navigate('/admin/users')}
              className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold text-left flex items-center justify-between"
            >
              <span>Quản lý Người dùng & Phân quyền</span>
              <Users className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={() => navigate('/admin/backups')}
              className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold text-left flex items-center justify-between"
            >
              <span>Sao lưu & Khôi phục JSON</span>
              <HardDriveDownload className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={() => navigate('/admin/settings')}
              className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold text-left flex items-center justify-between"
            >
              <span>Cài đặt Trường & Niên khóa</span>
              <Building className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
