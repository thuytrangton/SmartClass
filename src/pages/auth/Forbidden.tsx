import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const Forbidden: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">403 - Quyền truy cập bị từ chối</h1>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Tài khoản vai trò hiện tại của bạn không có quyền truy cập vào đường dẫn này.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={() => navigate(role ? `/${role}/dashboard` : '/login')}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs transition-colors"
          >
            <Home className="w-4 h-4" />
            Về bàn làm việc chính ({role || 'khách'})
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs py-2.5 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại trang trước
          </button>
        </div>
      </div>
    </div>
  );
};

export const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
        <h1 className="text-6xl font-black text-blue-600 tracking-tighter">404</h1>
        <h2 className="text-xl font-bold text-slate-900 mt-2">Trang không tồn tại</h2>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Đường dẫn bạn yêu cầu không tồn tại hoặc đã được di chuyển.
        </p>
        <button
          onClick={() => navigate(role ? `/${role}/dashboard` : '/login')}
          className="mt-6 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-colors"
        >
          <Home className="w-4 h-4" />
          Về trang chủ
        </button>
      </div>
    </div>
  );
};
