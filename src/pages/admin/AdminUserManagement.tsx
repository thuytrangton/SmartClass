import React, { useState } from 'react';
import {
  Users,
  UserCheck,
  Shield,
  Plus,
  Search,
  CheckCircle2,
  Lock,
  Edit
} from 'lucide-react';
import { DEMO_USERS } from '../../data/mockData';
import { UserRole, User } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { PageHeader, Modal } from '../../components/common/UIComponents';

export const AdminUserManagement: React.FC = () => {
  const { success } = useToast();
  const [users, setUsers] = useState<User[]>(DEMO_USERS);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const filtered = users.filter((u) => {
    const matchRole = filterRole === 'all' || u.role === filterRole;
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Người dùng & Phân quyền (RBAC)"
        subtitle="Quản lý danh sách tài khoản Admin, Giáo viên, Học sinh, Phụ huynh và phân quyền truy cập"
      />

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 outline-none"
          />
        </div>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium outline-none"
        >
          <option value="all">Tất cả vai trò (4 roles)</option>
          <option value="admin">Quản trị viên (Admin)</option>
          <option value="teacher">Giáo viên (Teacher)</option>
          <option value="student">Học sinh (Student)</option>
          <option value="parent">Phụ huynh (Parent)</option>
        </select>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="p-3.5 px-4">Người dùng</th>
                <th className="p-3.5 px-3">Email trường</th>
                <th className="p-3.5 px-3">Vai trò hệ thống</th>
                <th className="p-3.5 px-3">Số điện thoại</th>
                <th className="p-3.5 px-4 text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="p-3 px-4">
                    <div className="flex items-center gap-3">
                      <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
                      <span className="font-bold text-slate-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="p-3 px-3 font-mono text-slate-600">{u.email}</td>
                  <td className="p-3 px-3">
                    <span className="capitalize font-extrabold text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3 px-3 text-slate-500">{u.phone || 'Chưa cập nhật'}</td>
                  <td className="p-3 px-4 text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Hoạt động
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
