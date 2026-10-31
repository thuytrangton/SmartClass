import React, { useState } from 'react';
import {
  HardDriveDownload,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Download
} from 'lucide-react';
import { db } from '../../services/db';
import { useToast } from '../../contexts/ToastContext';
import { PageHeader, ConfirmDialog } from '../../components/common/UIComponents';

export const AdminBackupRestore: React.FC = () => {
  const { success, error } = useToast();
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const handleDownloadBackup = () => {
    const jsonStr = db.exportBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SmartClass_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Sao lưu thành công!', 'Tệp JSON đã được tải về máy của bạn.');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const ok = db.importBackupJson(text);
        if (ok) {
          success('Khôi phục thành công!', 'Dữ liệu hệ thống đã được phục hồi từ tệp JSON.');
        } else {
          error('Lỗi tệp sao lưu', 'Tệp JSON không đúng định dạng sao lưu của Smart Class.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFactoryReset = () => {
    db.resetToFactory();
    success('Đã đặt lại dữ liệu gốc!', 'Hệ thống đã phục hồi về trạng thái mẫu ban đầu.');
    setIsResetConfirmOpen(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Sao lưu & Phục hồi Dữ liệu (Backup & Restore)"
        subtitle="Quản lý bản sao lưu an toàn toàn bộ dữ liệu lớp học, điểm số và hồ sơ"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <HardDriveDownload className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-extrabold text-base text-slate-900">Xuất bản sao lưu (Backup)</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Tải về toàn bộ cấu trúc trường học, danh sách lớp, học sinh, điểm danh, bài tập và bảng điểm dưới dạng tệp JSON tiêu chuẩn.
            </p>
          </div>
          <button
            onClick={handleDownloadBackup}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Tải tệp sao lưu JSON về máy
          </button>
        </div>

        {/* Restore Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-extrabold text-base text-slate-900">Phục hồi từ bản sao lưu (Restore)</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Tải lên tệp JSON sao lưu trước đó để khôi phục lại trạng thái dữ liệu mong muốn.
            </p>
          </div>
          <label className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Chọn tệp JSON để phục hồi</span>
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Danger Zone: Factory Reset */}
      <div className="bg-rose-50/60 border border-rose-200 rounded-3xl p-6 space-y-3">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <h4 className="font-black text-sm text-rose-900">Vùng nguy hiểm: Đặt lại dữ liệu mẫu gốc</h4>
        </div>
        <p className="text-xs text-rose-800 leading-relaxed">
          Thao tác này sẽ xóa mọi thay đổi hiện tại và đặt lại toàn bộ hệ thống về dữ liệu demo chuẩn ban đầu (1 Admin, 2 Giáo viên, 2 Lớp học, 25 học sinh).
        </p>
        <button
          onClick={() => setIsResetConfirmOpen(true)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Đặt lại dữ liệu gốc (Factory Reset)
        </button>
      </div>

      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleFactoryReset}
        title="Xác nhận Đặt lại Dữ liệu Gốc"
        message="Bạn có chắc chắn muốn xóa mọi thay đổi và đưa hệ thống về dữ liệu mẫu ban đầu không? Thao tác này không thể hoàn tác."
        isDanger={true}
        confirmText="Xác nhận Đặt lại"
      />
    </div>
  );
};
