import React, { useState } from 'react';
import {
  FolderOpen,
  FileText,
  Video,
  Download,
  Upload,
  Search,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/db';
import { PageHeader, Modal } from '../../components/common/UIComponents';

export const LearningResources: React.FC = () => {
  const { success } = useToast();
  const resources = db.getResources();

  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');

  const filtered = resources.filter((r) => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) || r.folder.toLowerCase().includes(search.toLowerCase());
    const matchSubject = filterSubject === 'all' || r.subject === filterSubject;
    return matchSearch && matchSubject;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tài liệu số"
        subtitle="Quản lý kho học liệu số, giáo án điện tử, bài giảng và tài liệu bổ trợ môn học"
      >
        <button
          onClick={() => success('Đã mở giao diện tải lên', 'Tính năng tải tệp đính kèm sẵn sàng.')}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
        >
          <Upload className="w-4 h-4" />
          Tải lên tài liệu mới
        </button>
      </PageHeader>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm tài liệu, chuyên đề..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 outline-none"
          />
        </div>

        <select
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium outline-none"
        >
          <option value="all">Tất cả môn học</option>
          <option value="Toán học">Toán học</option>
          <option value="Ngữ văn">Ngữ văn</option>
          <option value="Tiếng Anh">Tiếng Anh</option>
        </select>
      </div>

      {/* Resource Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((res) => (
          <div
            key={res.id}
            className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-extrabold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                  {res.subject} (Khối {res.gradeLevel})
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                  {res.fileType.toUpperCase()}
                </span>
              </div>

              <h4 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-2">
                {res.title}
              </h4>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate">{res.folder}</span>
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>{res.fileSize || '2.5 MB'}</span>
              <button
                onClick={() => success('Bắt đầu tải về', `Đang tải: ${res.title}`)}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Tải xuống
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
