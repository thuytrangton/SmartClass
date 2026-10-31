import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Shield,
  UserCheck,
  ArrowRight,
  BookOpen,
  Sparkles,
  Award,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { DEMO_USERS } from '../../data/mockData';
import { UserRole } from '../../types';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('mai.tran@smartclass.edu.vn');
  const [password, setPassword] = useState('••••••••');
  const [isLoading, setIsLoading] = useState(false);

  const { login, loginWithGoogle, switchDemoRole } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const ok = await loginWithGoogle();
      if (ok) {
        success('Đăng nhập Firebase thành công!', 'Đã xác thực danh tính qua Google Cloud Firebase.');
        navigate('/teacher/dashboard');
      } else {
        error('Đăng nhập Google thất bại', 'Vui lòng kiểm tra lại tài khoản hoặc thử lại.');
      }
    } catch (err) {
      error('Lỗi xác thực', 'Không thể kết nối dịch vụ Google Firebase Auth.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const ok = await login(email, password);
      if (ok) {
        success('Đăng nhập thành công!', 'Chào mừng bạn quay trở lại Smart Class.');
        const matched = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
        const role = matched ? matched.role : 'teacher';
        navigate(`/${role}/dashboard`);
      } else {
        error('Đăng nhập thất bại', 'Vui lòng kiểm tra lại tài khoản.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = (role: UserRole) => {
    switchDemoRole(role);
    success(`Đã đăng nhập vai trò: ${role.toUpperCase()}`, 'Hệ thống đã nạp dữ liệu mẫu tương ứng.');
    navigate(`/${role}/dashboard`);
  };

  return (
    <div className="min-h-screen bg-[#060913] flex items-center justify-center p-4 dark-theme">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 bg-[#0f172a] rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
        {/* Left: Branding & Value props */}
        <div className="lg:col-span-6 p-8 lg:p-12 bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-700 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle decoration circles */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-extrabold text-2xl shadow-inner">
                SC
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight">SMART CLASS</h1>
                <p className="text-xs text-blue-200">Hệ sinh thái Quản lý Lớp học Thông minh</p>
              </div>
            </div>

            <h2 className="text-2xl lg:text-3xl font-extrabold leading-tight">
              Quản lý lớp học thông minh, gắn kết nhà trường & phụ huynh
            </h2>
            <p className="text-sm text-blue-100 mt-3 leading-relaxed">
              Giải pháp toàn diện 4-trong-1 dành cho Quản trị viên, Giáo viên chủ nhiệm, Học sinh và Phụ huynh học sinh.
            </p>

            <div className="mt-8 space-y-3.5">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                <span className="text-xs font-medium text-blue-50">Hồ sơ 360° học sinh & Điểm danh thông minh siêu tốc</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                <span className="text-xs font-medium text-blue-50">Bộ công cụ lớp học trực quan: Vòng quay, Chọn ngẫu nhiên, Đồng hồ</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                <span className="text-xs font-medium text-blue-50">AI Trợ giảng soạn đề kiểm tra, giáo án và nhận xét học bạ</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                <span className="text-xs font-medium text-blue-50">Cổng phụ huynh tra cứu chuyên cần, điểm số thời gian thực</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-10 pt-6 border-t border-white/15 flex items-center justify-between text-xs text-blue-200">
            <span>Trường THPT Chuyên Nguyễn Huệ</span>
            <span>Năm học 2025 - 2026</span>
          </div>
        </div>

        {/* Right: Login Form & Demo Quick Switches */}
        <div className="lg:col-span-6 p-8 lg:p-12 flex flex-col justify-between bg-white">
          <div>
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Đăng nhập tài khoản</h3>
              <p className="text-xs text-slate-500 mt-1">
                Chọn tài khoản demo để trải nghiệm ngay lập tức các tính năng theo vai trò
              </p>
            </div>

            {/* Quick Demo Switchers (One-click) */}
            <div className="mb-6">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Trải nghiệm nhanh (1 chạm không cần gõ mật khẩu)
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('teacher')}
                  className="p-3 rounded-2xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 hover:border-blue-300 text-left transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900">Giáo viên</span>
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <p className="text-[11px] text-blue-700 font-medium mt-0.5 truncate">Cô Trần Thị Mai (10A1)</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('student')}
                  className="p-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 hover:border-emerald-300 text-left transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900">Học sinh</span>
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <p className="text-[11px] text-emerald-700 font-medium mt-0.5 truncate">Nguyễn Minh Quân</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('parent')}
                  className="p-3 rounded-2xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100/70 hover:border-purple-300 text-left transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900">Phụ huynh</span>
                    <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <p className="text-[11px] text-purple-700 font-medium mt-0.5 truncate">Nguyễn Văn Hùng (Bố)</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('admin')}
                  className="p-3 rounded-2xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/70 hover:border-rose-300 text-left transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-900">Admin</span>
                    <Shield className="w-3.5 h-3.5 text-rose-600" />
                  </div>
                  <p className="text-[11px] text-rose-700 font-medium mt-0.5 truncate">Quản trị toàn trường</p>
                </button>
              </div>
            </div>

            {/* Google Firebase Auth Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs py-2.5 px-4 rounded-xl border border-slate-300 shadow-xs transition-all hover:shadow-md cursor-pointer mb-4"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Đăng nhập với Google (Firebase Auth)</span>
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white px-2 text-slate-400 font-bold">Hoặc dùng tài khoản trường cấp</span>
              </div>
            </div>

            {/* Standard Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email trường cấp</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mai.tran@smartclass.edu.vn"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Mật khẩu</label>
                  <a href="#forgot" className="text-[11px] text-blue-600 hover:underline">
                    Quên mật khẩu?
                  </a>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? 'Đang xử lý...' : 'Đăng nhập vào hệ thống'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-6">
            Bảo mật thông tin theo tiêu chuẩn EdTech ISO/IEC 27001
          </p>
        </div>
      </div>
    </div>
  );
};
