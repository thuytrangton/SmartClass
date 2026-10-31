import React, { useState } from 'react';
import {
  Award,
  Star,
  Plus,
  Trophy,
  Flame,
  ThumbsUp,
  ThumbsDown,
  Filter,
  Search
} from 'lucide-react';
import { useClass } from '../../contexts/ClassContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/db';
import { PageHeader, Modal } from '../../components/common/UIComponents';

export const BehaviorRewards: React.FC = () => {
  const { selectedClassId, selectedClass } = useClass();
  const { success } = useToast();

  const students = db.getStudentsByClass(selectedClassId);
  const behaviors = db.getBehaviors(selectedClassId);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [points, setPoints] = useState(5);
  const [category, setCategory] = useState('Hăng hái phát biểu');
  const [note, setNote] = useState('');

  // Sorted leaderboard by stars descending
  const sortedStudents = [...students].sort((a, b) => b.stars - a.stars);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const st = students.find((s) => s.id === selectedStudentId);
    if (!st) return;

    db.addBehavior({
      studentId: st.id,
      studentName: st.fullName,
      classId: selectedClassId,
      type: points >= 0 ? 'positive' : 'negative',
      points,
      category,
      note: note || 'Ghi nhận rèn luyện',
      teacherName: selectedClass?.homeroomTeacherName || 'Cô Trần Thị Mai'
    });

    success(
      points >= 0 ? `Đã cộng +${points} sao!` : `Đã trừ ${points} sao!`,
      `Cập nhật cho học sinh ${st.fullName}.`
    );
    setIsAddModalOpen(false);
    setNote('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hành vi & Thi đua Lớp học - Lớp ${selectedClass?.name || '10A1'}`}
        subtitle="Hệ thống vinh danh tích cực, tính điểm rèn luyện và bảng xếp hạng sao học sinh"
      >
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl text-xs font-extrabold transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Ghi nhận hành vi / Tặng sao
        </button>
      </PageHeader>

      {/* Top 3 Podium (Bảng vàng vinh danh) */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-200" />
            <h3 className="font-black text-lg">BẢNG VÀNG THI ĐUA TOP HỌC SINH</h3>
          </div>
          <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full backdrop-blur-xs">
            Tháng 10/2026
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {sortedStudents.slice(0, 3).map((st, index) => {
            const ranks = [
              { title: 'Quán quân (Hạng 1)', badge: 'bg-yellow-400 text-slate-900', ring: 'ring-yellow-300' },
              { title: 'Á quân (Hạng 2)', badge: 'bg-slate-200 text-slate-800', ring: 'ring-slate-300' },
              { title: 'Hạng Ba', badge: 'bg-amber-700 text-white', ring: 'ring-amber-400' }
            ];

            return (
              <div
                key={st.id}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex items-center gap-4 shadow-sm"
              >
                <div className="relative">
                  <img
                    src={st.avatar}
                    alt={st.fullName}
                    className={`w-14 h-14 rounded-2xl object-cover ring-2 ${ranks[index].ring}`}
                  />
                  <span
                    className={`absolute -top-2 -left-2 text-[10px] font-black px-1.5 py-0.5 rounded-md ${ranks[index].badge}`}
                  >
                    #{index + 1}
                  </span>
                </div>
                <div>
                  <h4 className="font-extrabold text-sm">{st.fullName}</h4>
                  <p className="text-[11px] text-yellow-100">{ranks[index].title}</p>
                  <p className="text-sm font-black text-yellow-200 mt-1 flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-300 text-yellow-300" /> {st.stars} sao
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: Full Leaderboard & Recent Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Full Leaderboard Table (6 cols) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="font-extrabold text-sm text-slate-900">Bảng xếp hạng tất cả học sinh</h4>
            <span className="text-xs text-slate-400">{sortedStudents.length} học sinh</span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {sortedStudents.map((st, idx) => (
              <div
                key={st.id}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center font-bold text-xs text-slate-400">#{idx + 1}</span>
                  <img src={st.avatar} alt={st.fullName} className="w-8 h-8 rounded-full object-cover" />
                  <div>
                    <p className="font-bold text-xs text-slate-800">{st.fullName}</p>
                    <p className="text-[10px] text-slate-400">Hạnh kiểm {st.conduct}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {st.stars}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Behavior Logs (6 cols) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="font-extrabold text-sm text-slate-900">Nhật ký rèn luyện gần đây</h4>
            <span className="text-xs text-slate-400">{behaviors.length} lượt</span>
          </div>

          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {behaviors.map((b) => (
              <div
                key={b.id}
                className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                  b.points >= 0
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50/50 border-rose-200 text-rose-900'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{b.studentName}</span>
                    <span className="text-[10px] text-slate-500">({b.category})</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">{b.note}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {b.date} • Ghi bởi: {b.teacherName}
                  </p>
                </div>

                <span
                  className={`font-black text-xs px-2.5 py-1 rounded-lg ${
                    b.points >= 0 ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                  }`}
                >
                  {b.points >= 0 ? `+${b.points}` : b.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal: Ghi nhận hành vi */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Ghi nhận Hành vi & Tặng sao Thi đua"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Chọn học sinh *</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.code} - Hiện có {s.stars} sao)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setPoints(5);
                setCategory('Hăng hái phát biểu');
              }}
              className={`py-2 rounded-xl border text-xs font-bold ${
                points > 0 ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-600'
              }`}
            >
              + Khen thưởng (+Sao)
            </button>
            <button
              type="button"
              onClick={() => {
                setPoints(-3);
                setCategory('Nói chuyện riêng');
              }}
              className={`py-2 rounded-xl border text-xs font-bold ${
                points < 0 ? 'bg-rose-50 border-rose-500 text-rose-700' : 'border-slate-200 text-slate-600'
              }`}
            >
              - Nhắc nhở (-Sao)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Số sao</label>
              <input
                type="number"
                value={points}
                onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hạng mục</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none"
              >
                <option value="Hăng hái phát biểu">Hăng hái phát biểu</option>
                <option value="Làm bài tập xuất sắc">Làm bài tập xuất sắc</option>
                <option value="Giúp đỡ bạn bè">Giúp đỡ bạn bè</option>
                <option value="Đạt điểm 10 kiểm tra">Đạt điểm 10 kiểm tra</option>
                <option value="Nói chuyện riêng">Nói chuyện riêng</option>
                <option value="Đi học muộn">Đi học muộn</option>
                <option value="Quên làm bài tập">Quên làm bài tập</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú cụ thể</label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Xung phong lên bảng sửa bài tập khó..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none"
            />
          </div>

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
              Xác nhận
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
