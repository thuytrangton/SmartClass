import React, { useState } from 'react';
import {
  Bell,
  Plus,
  AlertCircle,
  Eye,
  Send,
  Users,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { useClass } from '../../contexts/ClassContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/db';
import { Announcement } from '../../types';
import { PageHeader, Modal } from '../../components/common/UIComponents';

export const Announcements: React.FC = () => {
  const { selectedClassId, selectedClass } = useClass();
  const { currentUser } = useAuth();
  const { success, error } = useToast();

  const announcements = db.getAnnouncements();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetRole, setTargetRole] = useState<'all' | 'teachers' | 'students' | 'parents'>('parents');
  const [isUrgent, setIsUrgent] = useState(false);

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      error('Thiếu thông tin', 'Vui lòng điền tiêu đề và nội dung thông báo.');
      return;
    }

    db.addAnnouncement({
      title,
      content,
      authorId: currentUser?.id || 'usr-teacher-01',
      authorName: `${currentUser?.name || 'Cô Trần Thị Mai'} (GVCN)`,
      targetRole,
      targetClassId: selectedClassId,
      targetClassName: selectedClass?.name || '10A1',
      isUrgent
    });

    success('Đăng thông báo thành công!', 'Thông báo đã được gửi đến người nhận tương ứng.');
    setIsAddModalOpen(false);
    setTitle('');
    setContent('');
    setIsUrgent(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bảng tin & Thông báo Nhà trường"
        subtitle="Kênh thông tin chính thống gửi đến Giáo viên, Phụ huynh và Học sinh"
      >
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Tạo thông báo mới
        </button>
      </PageHeader>

      <div className="space-y-4">
        {announcements.map((anc) => (
          <div
            key={anc.id}
            className={`p-6 rounded-3xl border transition-all bg-white shadow-xs hover:shadow-md ${
              anc.isUrgent ? 'border-rose-200 ring-2 ring-rose-50' : 'border-slate-200/80'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {anc.isUrgent && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800">
                      Khẩn cấp
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700">
                    Đối tượng: {anc.targetRole.toUpperCase()}
                  </span>
                  {anc.targetClassName && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700">
                      Lớp {anc.targetClassName}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {new Date(anc.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>

                <h3 className="font-extrabold text-base text-slate-900 leading-snug">{anc.title}</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed whitespace-pre-line">
                  {anc.content}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>Người đăng: <strong className="text-slate-700">{anc.authorName}</strong></span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> {anc.readCount} lượt xem
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Đăng thông báo */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tạo Thông báo Mới"
        subtitle={`Gửi thông báo lớp ${selectedClass?.name}`}
      >
        <form onSubmit={handleCreateAnnouncement} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Đối tượng nhận thông báo *</label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value as any)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none"
            >
              <option value="parents">Chỉ Phụ huynh học sinh</option>
              <option value="students">Chỉ Học sinh</option>
              <option value="all">Toàn thể lớp (Phụ huynh & Học sinh)</option>
              <option value="teachers">Giáo viên</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tiêu đề thông báo *</label>
            <input
              type="text"
              required
              placeholder="VD: Kế hoạch thi giữa kỳ 1, Nhắc nhở nộp hồ sơ..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nội dung chi tiết *</label>
            <textarea
              rows={4}
              required
              placeholder="Nhập nội dung đầy đủ của thông báo..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isUrgent}
              onChange={(e) => setIsUrgent(e.target.checked)}
              className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
            />
            Đánh dấu là thông báo KHẨN CẤP (Gửi notification ưu tiên cao)
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              Đăng thông báo
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
