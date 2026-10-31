import React, { useState } from 'react';
import { Building, Save, CheckCircle2 } from 'lucide-react';
import { db } from '../../services/db';
import { useToast } from '../../contexts/ToastContext';
import { PageHeader } from '../../components/common/UIComponents';

export const AdminSettings: React.FC = () => {
  const { success } = useToast();
  const school = db.getSchool();

  const [name, setName] = useState(school.name);
  const [code, setCode] = useState(school.code);
  const [address, setAddress] = useState(school.address);
  const [phone, setPhone] = useState(school.phone);
  const [principal, setPrincipal] = useState(school.principal);
  const [academicYear, setAcademicYear] = useState(school.academicYear);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateSchool({
      name,
      code,
      address,
      phone,
      principal,
      academicYear
    });
    success('Lưu cấu hình thành công!', 'Thông tin trường học đã được cập nhật toàn hệ thống.');
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Cấu hình Thông tin Trường học & Niên khóa"
        subtitle="Quản lý định danh cơ sở giáo dục và cấu hình chung hệ thống"
      />

      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tên trường *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mã định danh trường *</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hiệu trưởng *</label>
              <input
                type="text"
                required
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Năm học hiện tại *</label>
              <input
                type="text"
                required
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Địa chỉ trụ sở trường</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại liên hệ</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              Lưu cấu hình trường học
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
