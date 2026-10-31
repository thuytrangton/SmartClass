import React, { useState } from 'react';
import { History, Search, Filter, ShieldCheck, Download } from 'lucide-react';
import { db } from '../../services/db';
import { PageHeader } from '../../components/common/UIComponents';

export const AdminAuditLogs: React.FC = () => {
  const auditLogs = db.getAuditLogs();
  const [filterCat, setFilterCat] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = auditLogs.filter((l) => {
    const matchCat = filterCat === 'all' || l.category === filterCat;
    const matchSearch =
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.userName.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nhật ký Kiểm toán Hệ thống (Audit Logs)"
        subtitle="Ghi nhận mọi thao tác nhạy cảm: Chỉnh sửa điểm, Điểm danh, Đăng ký người dùng, Thay đổi hệ thống"
      />

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo hành động, người thực hiện..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 outline-none"
          />
        </div>

        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium outline-none"
        >
          <option value="all">Tất cả phân loại</option>
          <option value="grade">Sổ điểm (Grade)</option>
          <option value="attendance">Điểm danh (Attendance)</option>
          <option value="assignment">Bài tập (Assignment)</option>
          <option value="student">Học sinh (Student)</option>
          <option value="system">Hệ thống (System)</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="p-3.5 px-4">Thời gian</th>
                <th className="p-3.5 px-3">Phân loại</th>
                <th className="p-3.5 px-3">Hành động</th>
                <th className="p-3.5 px-4">Chi tiết thao tác</th>
                <th className="p-3.5 px-3">Người thực hiện</th>
                <th className="p-3.5 px-3">Địa chỉ IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="p-3 px-4 font-mono text-[11px] text-slate-400">{log.timestamp}</td>
                  <td className="p-3 px-3">
                    <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {log.category}
                    </span>
                  </td>
                  <td className="p-3 px-3 font-bold text-slate-900">{log.action}</td>
                  <td className="p-3 px-4 text-slate-600 max-w-sm">{log.details}</td>
                  <td className="p-3 px-3 font-medium text-blue-700">{log.userName}</td>
                  <td className="p-3 px-3 font-mono text-slate-400 text-[11px]">{log.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
