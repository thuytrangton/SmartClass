import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  Shield,
  UserCheck,
  ArrowRight,
  BookOpen,
  Sparkles,
  Award,
  CheckCircle2,
  UserPlus,
  LogIn,
  Eye,
  EyeOff,
  School,
  Mail,
  Lock,
  User,
  Phone
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { DEMO_USERS } from '../../data/mockData';
import { UserRole } from '../../types';

interface LoginProps {
  defaultTab?: 'login' | 'register';
}

export const Login: React.FC<LoginProps> = ({ defaultTab = 'login' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, register, loginWithGoogle, switchDemoRole } = useAuth();
  const { success, error, warning } = useToast();

  const isRegisterRoute = location.pathname === '/register' || defaultTab === 'register';
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(isRegisterRoute ? 'register' : 'login');

  useEffect(() => {
    if (location.pathname === '/register') {
      setActiveTab('register');
    }
  }, [location.pathname]);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('mai.tran@smartclass.edu.vn');
  const [loginPassword, setLoginPassword] = useState('••••••••');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('teacher');
  const [regSchool, setRegSchool] = useState('Trường THPT Chuyên Nguyễn Huệ');
  const [regPhone, setRegPhone] = useState('');
  const [regClass, setRegClass] = useState('10A1');
  const [regAgreeTerms, setRegAgreeTerms] = useState(true);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  // Google sign in/register
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
    } catch {
      error('Lỗi xác thực', 'Không thể kết nối dịch vụ Google Firebase Auth.');
    } finally {
      setIsLoading(false);
    }
  };

  // Login submit handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await login(loginEmail, loginPassword);
      if (res.success) {
        success('Đăng nhập thành công!', 'Chào mừng bạn quay trở lại Smart Class.');
        const matched = DEMO_USERS.find((u) => u.email.toLowerCase() === loginEmail.toLowerCase());
        const targetRole = matched ? matched.role : 'teacher';
        navigate(`/${targetRole}/dashboard`);
      } else {
        error('Đăng nhập thất bại', res.error || 'Vui lòng kiểm tra lại tài khoản.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Register submit handler
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      warning('Thiếu thông tin', 'Vui lòng nhập Họ và tên.');
      return;
    }
    if (!regEmail.trim()) {
      warning('Thiếu thông tin', 'Vui lòng nhập địa chỉ Email.');
      return;
    }
    if (regPassword.length < 6) {
      warning('Mật khẩu quá ngắn', 'Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      warning('Mật khẩu không khớp', 'Mật khẩu và xác nhận mật khẩu không trùng khớp.');
      return;
    }
    if (!regAgreeTerms) {
      warning('Chưa đồng ý điều khoản', 'Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách bảo mật.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await register({
        name: regName,
        email: regEmail,
        password: regPassword,
        role: regRole,
        schoolName: regSchool,
        phone: regPhone,
        className: regClass
      });

      if (res.success) {
        success('Đăng ký tài khoản thành công!', `Chào mừng ${regName} gia nhập hệ sinh thái Smart Class.`);
        navigate(`/${regRole}/dashboard`);
      } else {
        error('Đăng ký không thành công', res.error || 'Vui lòng kiểm tra lại thông tin đăng ký.');
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
    <div className="min-h-screen bg-[#060913] flex items-center justify-center p-4 lg:p-6 text-slate-100">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 bg-[#0d1527] rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
        {/* Left: Branding & Value props */}
        <div className="lg:col-span-5 p-8 lg:p-10 bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-700 text-white flex flex-col justify-between relative overflow-hidden">
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

            <h2 className="text-2xl font-extrabold leading-tight">
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
                <span className="text-xs font-medium text-blue-50">Lưu trữ đồng bộ thời gian thực qua Cloud Firestore & Firebase Auth</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-8 pt-6 border-t border-white/15 flex items-center justify-between text-xs text-blue-200">
            <span>Trường THPT Chuyên Nguyễn Huệ</span>
            <span>Năm học 2025 - 2026</span>
          </div>
        </div>

        {/* Right: Login & Register Forms */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-[#0b1324]">
          <div>
            {/* Top Navigation Tabs */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2 bg-[#070c18] p-1.5 rounded-2xl border border-slate-800/80 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'login'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'register'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  Đăng ký tài khoản
                </button>
              </div>

              <span className="hidden sm:inline text-[11px] text-slate-500 font-medium">
                {activeTab === 'login' ? 'Truy cập tài khoản' : 'Tạo tài khoản mới'}
              </span>
            </div>

            {/* TAB 1: ĐĂNG NHẬP */}
            {activeTab === 'login' && (
              <div className="animate-in fade-in duration-200">
                <div className="mb-5">
                  <h3 className="text-xl font-bold text-slate-100 tracking-tight">Đăng nhập tài khoản</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Chọn vai trò trải nghiệm nhanh 1 chạm hoặc đăng nhập với email trường cấp
                  </p>
                </div>

                {/* Quick Demo Switchers (One-click) */}
                <div className="mb-5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Trải nghiệm nhanh (1 chạm không cần gõ mật khẩu)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickDemo('teacher')}
                      className="p-2.5 rounded-xl border border-blue-900/60 bg-blue-950/30 hover:bg-blue-900/50 hover:border-blue-700 text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-blue-300">Giáo viên</span>
                        <Sparkles className="w-3 h-3 text-blue-400" />
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">Cô Trần Thị Mai</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickDemo('student')}
                      className="p-2.5 rounded-xl border border-emerald-900/60 bg-emerald-950/30 hover:bg-emerald-900/50 hover:border-emerald-700 text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-300">Học sinh</span>
                        <GraduationCap className="w-3 h-3 text-emerald-400" />
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">Nguyễn Minh Quân</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickDemo('parent')}
                      className="p-2.5 rounded-xl border border-purple-900/60 bg-purple-950/30 hover:bg-purple-900/50 hover:border-purple-700 text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-purple-300">Phụ huynh</span>
                        <UserCheck className="w-3 h-3 text-purple-400" />
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">Nguyễn Văn Hùng</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickDemo('admin')}
                      className="p-2.5 rounded-xl border border-rose-900/60 bg-rose-950/30 hover:bg-rose-900/50 hover:border-rose-700 text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-rose-300">Admin</span>
                        <Shield className="w-3 h-3 text-rose-400" />
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">Quản trị viên</p>
                    </button>
                  </div>
                </div>

                {/* Google Firebase Auth Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs py-2.5 px-4 rounded-xl border border-slate-700/80 shadow-xs transition-all hover:border-slate-600 cursor-pointer mb-4"
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
                    <div className="w-full border-t border-slate-800"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-[#0b1324] px-2.5 text-slate-400 font-bold tracking-wider">
                      Hoặc dùng tài khoản trường cấp
                    </span>
                  </div>
                </div>

                {/* Standard Login Form */}
                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Email trường cấp</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="mai.tran@smartclass.edu.vn"
                        className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl bg-[#070c18] border border-slate-800 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-slate-300">Mật khẩu</label>
                      <button
                        type="button"
                        onClick={() => success('Khôi phục mật khẩu', 'Vui lòng liên hệ quản trị viên nhà trường hoặc kiểm tra email đăng ký.')}
                        className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full text-xs pl-10 pr-10 py-2.5 rounded-xl bg-[#070c18] border border-slate-800 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? 'Đang xử lý...' : 'Đăng nhập vào hệ thống'}
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="text-center pt-2">
                    <p className="text-xs text-slate-400">
                      Chưa có tài khoản?{' '}
                      <button
                        type="button"
                        onClick={() => setActiveTab('register')}
                        className="font-bold text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
                      >
                        Đăng ký tài khoản mới ngay
                      </button>
                    </p>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: ĐĂNG KÝ TÀI KHOẢN */}
            {activeTab === 'register' && (
              <div className="animate-in fade-in duration-200">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-slate-100 tracking-tight">Tạo tài khoản mới</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Đăng ký tài khoản tham gia hệ thống Quản lý Lớp học Thông minh
                  </p>
                </div>

                <form onSubmit={handleRegisterSubmit} className="space-y-3">
                  {/* Select Role */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Chọn vai trò của bạn <span className="text-rose-400">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setRegRole('teacher')}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          regRole === 'teacher'
                            ? 'bg-blue-950/80 border-blue-500 text-blue-300 ring-1 ring-blue-500'
                            : 'bg-[#070c18] border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs font-bold">Giáo viên</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRegRole('student')}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          regRole === 'student'
                            ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                            : 'bg-[#070c18] border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <GraduationCap className="w-4 h-4" />
                        <span className="text-xs font-bold">Học sinh</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRegRole('parent')}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          regRole === 'parent'
                            ? 'bg-purple-950/80 border-purple-500 text-purple-300 ring-1 ring-purple-500'
                            : 'bg-[#070c18] border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <UserCheck className="w-4 h-4" />
                        <span className="text-xs font-bold">Phụ huynh</span>
                      </button>
                    </div>
                  </div>

                  {/* Name & Phone in 2 cols */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Họ và tên <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="VD: Thầy Nguyễn Văn An"
                          className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl bg-[#070c18] border border-slate-800 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Số điện thoại
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="0912 345 678"
                          className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl bg-[#070c18] border border-slate-800 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Email đăng ký <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="nguyenvanan@smartclass.edu.vn"
                        className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl bg-[#070c18] border border-slate-800 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* School & Class */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Trường học
                      </label>
                      <div className="relative">
                        <School className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={regSchool}
                          onChange={(e) => setRegSchool(e.target.value)}
                          placeholder="Tên trường học"
                          className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl bg-[#070c18] border border-slate-800 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Lớp học
                      </label>
                      <select
                        value={regClass}
                        onChange={(e) => setRegClass(e.target.value)}
                        className="w-full text-xs px-3 py-2.5 rounded-xl bg-[#070c18] border border-slate-800 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      >
                        <option value="10A1">Lớp 10A1</option>
                        <option value="10A2">Lớp 10A2</option>
                        <option value="11B1">Lớp 11B1</option>
                        <option value="12C1">Lớp 12C1</option>
                      </select>
                    </div>
                  </div>

                  {/* Password & Confirm Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Mật khẩu <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Ít nhất 6 ký tự"
                          className="w-full text-xs pl-10 pr-10 py-2.5 rounded-xl bg-[#070c18] border border-slate-800 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                        >
                          {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Xác nhận mật khẩu <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showRegConfirmPassword ? 'text' : 'password'}
                          required
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="Nhập lại mật khẩu"
                          className="w-full text-xs pl-10 pr-10 py-2.5 rounded-xl bg-[#070c18] border border-slate-800 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                        >
                          {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Agree Terms Checkbox */}
                  <div className="pt-1">
                    <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-400">
                      <input
                        type="checkbox"
                        checked={regAgreeTerms}
                        onChange={(e) => setRegAgreeTerms(e.target.checked)}
                        className="mt-0.5 rounded bg-[#070c18] border-slate-800 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                      <span>
                        Tôi đồng ý với{' '}
                        <span className="text-blue-400 hover:underline">Điều khoản sử dụng dịch vụ</span>{' '}
                        và cam kết tuân thủ quy chế bảo mật của nhà trường.
                      </span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? 'Đang tạo tài khoản...' : 'Đăng ký tài khoản ngay'}
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="text-center pt-2">
                    <p className="text-xs text-slate-400">
                      Đã có tài khoản?{' '}
                      <button
                        type="button"
                        onClick={() => setActiveTab('login')}
                        className="font-bold text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
                      >
                        Đăng nhập ngay
                      </button>
                    </p>
                  </div>
                </form>
              </div>
            )}
          </div>

          <p className="text-center text-[11px] text-slate-500 mt-6 pt-4 border-t border-slate-800/60">
            Hệ sinh thái EdTech Smart Class • Tiêu chuẩn an toàn & bảo mật ISO/IEC 27001
          </p>
        </div>
      </div>
    </div>
  );
};
