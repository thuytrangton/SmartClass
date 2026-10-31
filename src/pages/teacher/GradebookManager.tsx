import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  History,
  Save,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { useClass } from '../../contexts/ClassContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/db';
import { exportImportService } from '../../services/exportImport';
import { PageHeader, Modal } from '../../components/common/UIComponents';

export const GradebookManager: React.FC = () => {
  const {
    selectedClassId,
    selectedClass,
    selectedSubject,
    setSelectedSubject,
    allSubjects,
    addSubject,
    selectedSemester,
    setSelectedSemester
  } = useClass();
  const { currentUser } = useAuth();
  const { success, error } = useToast();

  const [search, setSearch] = useState('');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [showAddSubjectPrompt, setShowAddSubjectPrompt] = useState(false);
  const [quickNewSubjectText, setQuickNewSubjectText] = useState('');

  // Edit cell modal state
  const [editGradeTarget, setEditGradeTarget] = useState<{
    gradeId: string;
    studentName: string;
    field: 'tx1' | 'tx2' | 'tx3' | 'gk' | 'ck';
    currentValue: number | undefined;
  } | null>(null);

  const [newScoreVal, setNewScoreVal] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('Chấm bổ sung bài kiểm tra');

  const grades = db.getGradesByClassAndSubject(selectedClassId, selectedSubject, selectedSemester);
  const gradeHistory = db.getGradeHistory();

  const handleOpenEdit = (gradeId: string, studentName: string, field: 'tx1' | 'tx2' | 'tx3' | 'gk' | 'ck', val: number | undefined) => {
    setEditGradeTarget({ gradeId, studentName, field, currentValue: val });
    setNewScoreVal(val !== undefined ? val.toString() : '');
    setEditReason('Chấm kiểm tra bổ sung / Phúc khảo');
  };

  const handleSaveScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGradeTarget) return;

    const num = parseFloat(newScoreVal);
    if (isNaN(num) || num < 0 || num > 10) {
      error('Điểm không hợp lệ', 'Điểm phải là số thực từ 0.0 đến 10.0');
      return;
    }

    db.updateGradeItem(
      editGradeTarget.gradeId,
      editGradeTarget.field,
      num,
      editReason,
      currentUser?.name || 'Cô Trần Thị Mai'
    );

    success(
      'Cập nhật điểm thành công!',
      `Đã cập nhật cột ${editGradeTarget.field.toUpperCase()} của ${editGradeTarget.studentName} thành ${num}.`
    );
    setEditGradeTarget(null);
  };

  const handleExportCsv = () => {
    exportImportService.exportGradesToCsv(grades, selectedClass?.name || '10A1', selectedSubject);
    success('Xuất file thành công', `Đã xuất bảng điểm môn ${selectedSubject} ra CSV.`);
  };

  const filteredGrades = grades.filter((g) => g.studentName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Sổ điểm Điện tử - Lớp ${selectedClass?.name || '10A1'}`}
        subtitle={`Quản lý bảng điểm thành phần môn ${selectedSubject} • Lưu vết lịch sử chỉnh sửa điểm theo quy định Bộ GD&ĐT`}
      >
        <button
          onClick={() => setIsHistoryModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all shadow-xs"
        >
          <History className="w-4 h-4 text-purple-600" />
          Lịch sử sửa điểm ({gradeHistory.length})
        </button>
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
        >
          <Download className="w-4 h-4" />
          Xuất Bảng điểm (CSV)
        </button>
      </PageHeader>

      {/* Selectors Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Môn học</label>
            <div className="flex items-center gap-1.5">
              <select
                value={selectedSubject}
                onChange={(e) => {
                  if (e.target.value === '__add_new__') {
                    setShowAddSubjectPrompt(true);
                  } else {
                    setSelectedSubject(e.target.value);
                  }
                }}
                className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 font-bold text-slate-800 bg-white outline-none focus:border-blue-500 cursor-pointer"
                title="Thay đổi môn học nhập điểm trực tiếp"
              >
                {allSubjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                  <option value="__add_new__" className="text-blue-600 font-bold">
                  + Thêm môn học khác...
                </option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Học kỳ</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value as 'HK1' | 'HK2')}
              className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 font-bold text-slate-800 bg-white outline-none focus:border-blue-500"
            >
              <option value="HK1">Học kỳ 1</option>
              <option value="HK2">Học kỳ 2</option>
            </select>
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên học sinh..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Grade Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">STT</th>
                <th className="py-3 px-4">Họ và tên</th>
                <th className="py-3 px-3 text-center">TX 1 (HS 1)</th>
                <th className="py-3 px-3 text-center">TX 2 (HS 1)</th>
                <th className="py-3 px-3 text-center">TX 3 (HS 1)</th>
                <th className="py-3 px-3 text-center bg-blue-50/50">Giữa kỳ (HS 2)</th>
                <th className="py-3 px-3 text-center bg-purple-50/50">Cuối kỳ (HS 3)</th>
                <th className="py-3 px-3 text-center bg-emerald-50/60 text-emerald-900 font-extrabold">ĐTB Môn</th>
                <th className="py-3 px-4">Nhận xét & Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGrades.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Chưa có dữ liệu điểm môn {selectedSubject} cho lớp này.
                  </td>
                </tr>
              ) : (
                filteredGrades.map((g, idx) => (
                  <tr key={g.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{g.studentName}</td>

                    {/* TX1 */}
                    <td
                      onClick={() => handleOpenEdit(g.id, g.studentName, 'tx1', g.tx1)}
                      className="py-3 px-3 text-center font-semibold cursor-pointer hover:bg-blue-100/50 rounded-lg transition-colors"
                      title="Nhấn để sửa điểm"
                    >
                      {g.tx1 !== undefined ? g.tx1 : <span className="text-slate-300">-</span>}
                    </td>

                    {/* TX2 */}
                    <td
                      onClick={() => handleOpenEdit(g.id, g.studentName, 'tx2', g.tx2)}
                      className="py-3 px-3 text-center font-semibold cursor-pointer hover:bg-blue-100/50 rounded-lg transition-colors"
                      title="Nhấn để sửa điểm"
                    >
                      {g.tx2 !== undefined ? g.tx2 : <span className="text-slate-300">-</span>}
                    </td>

                    {/* TX3 */}
                    <td
                      onClick={() => handleOpenEdit(g.id, g.studentName, 'tx3', g.tx3)}
                      className="py-3 px-3 text-center font-semibold cursor-pointer hover:bg-blue-100/50 rounded-lg transition-colors"
                      title="Nhấn để sửa điểm"
                    >
                      {g.tx3 !== undefined ? g.tx3 : <span className="text-slate-300">-</span>}
                    </td>

                    {/* GK */}
                    <td
                      onClick={() => handleOpenEdit(g.id, g.studentName, 'gk', g.gk)}
                      className="py-3 px-3 text-center font-bold text-blue-700 bg-blue-50/30 cursor-pointer hover:bg-blue-100/60 rounded-lg transition-colors"
                      title="Nhấn để sửa điểm Giữa kỳ"
                    >
                      {g.gk !== undefined ? g.gk : <span className="text-slate-300">-</span>}
                    </td>

                    {/* CK */}
                    <td
                      onClick={() => handleOpenEdit(g.id, g.studentName, 'ck', g.ck)}
                      className="py-3 px-3 text-center font-bold text-purple-700 bg-purple-50/30 cursor-pointer hover:bg-purple-100/60 rounded-lg transition-colors"
                      title="Nhấn để sửa điểm Cuối kỳ"
                    >
                      {g.ck !== undefined ? g.ck : <span className="text-slate-300">-</span>}
                    </td>

                    {/* Average */}
                    <td className="py-3 px-3 text-center bg-emerald-50/40">
                      <span className="font-extrabold text-emerald-800 text-sm">
                        {g.average !== undefined ? g.average : '-'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-500 text-[11px] truncate max-w-xs">{g.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Mẹo: Nhấn trực tiếp vào bất kỳ ô điểm nào để chỉnh sửa và lưu lý do điều chỉnh</span>
          <span className="font-semibold text-blue-600">ĐTB = (TX1 + TX2 + TX3 + GK*2 + CK*3) / 8</span>
        </div>
      </div>

      {/* Modal: Edit Score with Reason & Audit Log */}
      <Modal
        isOpen={!!editGradeTarget}
        onClose={() => setEditGradeTarget(null)}
        title="Chỉnh sửa điểm số & Lý do điều chỉnh"
        subtitle={`Học sinh: ${editGradeTarget?.studentName} • Cột điểm: ${editGradeTarget?.field.toUpperCase()}`}
      >
        <form onSubmit={handleSaveScore} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Điểm mới (Thang điểm 10) *</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              required
              autoFocus
              value={newScoreVal}
              onChange={(e) => setNewScoreVal(e.target.value)}
              className="w-full text-lg font-bold text-blue-600 px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Lý do điều chỉnh (Bắt buộc theo quy chế kiểm toán điểm) *</label>
            <input
              type="text"
              required
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder="VD: Phúc khảo bài kiểm tra, Sửa lỗi gõ máy..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>Mọi thao tác sửa điểm sẽ được lưu vĩnh viễn vào Nhật ký Kiểm toán điểm kèm tên giáo viên thực hiện.</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditGradeTarget(null)}
              className="px-4 py-2 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-xl shadow-xs"
            >
              Xác nhận lưu điểm
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Lịch sử sửa điểm */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Nhật ký Lịch sử Chỉnh sửa Điểm (Grade Audit Log)"
        subtitle="Theo dõi toàn bộ các lần thay đổi điểm của giáo viên"
        maxWidth="3xl"
      >
        <div className="space-y-3">
          {gradeHistory.length === 0 ? (
            <p className="text-center py-6 text-xs text-slate-400">Chưa có lịch sử thay đổi điểm nào.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 sticky top-0 text-[10px] uppercase text-slate-600 font-bold">
                  <tr>
                    <th className="p-2.5">Thời gian</th>
                    <th className="p-2.5">Học sinh</th>
                    <th className="p-2.5">Cột</th>
                    <th className="p-2.5">Điểm cũ → mới</th>
                    <th className="p-2.5">Lý do</th>
                    <th className="p-2.5">Người sửa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gradeHistory.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50">
                      <td className="p-2.5 text-slate-400 font-mono text-[11px]">{h.timestamp}</td>
                      <td className="p-2.5 font-bold text-slate-800">{h.studentName}</td>
                      <td className="p-2.5 font-semibold text-blue-600">{h.columnChanged}</td>
                      <td className="p-2.5 font-mono">
                        <span className="line-through text-slate-400">{h.oldValue ?? 'None'}</span> →{' '}
                        <span className="font-bold text-emerald-600">{h.newValue}</span>
                      </td>
                      <td className="p-2.5 text-slate-600">{h.reason}</td>
                      <td className="p-2.5 font-medium text-slate-700">{h.changedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setIsHistoryModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-xs font-bold text-white rounded-xl"
            >
              Đóng
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Thêm & Đổi Môn học mới trong Sổ điểm */}
      {showAddSubjectPrompt && (
        <Modal
          isOpen={showAddSubjectPrompt}
          onClose={() => setShowAddSubjectPrompt(false)}
          title="Thay đổi & Thêm Môn học Mới"
          subtitle="Chọn hoặc tạo môn học mới để nhập điểm cho học sinh"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Tên môn học mới:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="VD: Tin học, STEM, GDKT&PL, Âm nhạc..."
                  value={quickNewSubjectText}
                  onChange={(e) => setQuickNewSubjectText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const trimmed = quickNewSubjectText.trim();
                      if (trimmed) {
                        addSubject(trimmed);
                        success('Đã thêm môn học', `Đang hiển thị bảng điểm môn ${trimmed}.`);
                        setQuickNewSubjectText('');
                        setShowAddSubjectPrompt(false);
                      }
                    }
                  }}
                  className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = quickNewSubjectText.trim();
                    if (trimmed) {
                      addSubject(trimmed);
                      success('Đã thêm môn học', `Đang hiển thị bảng điểm môn ${trimmed}.`);
                      setQuickNewSubjectText('');
                      setShowAddSubjectPrompt(false);
                    }
                  }}
                  disabled={!quickNewSubjectText.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Thêm & Chọn
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-600 mb-2">Hoặc chọn môn có sẵn:</p>
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1">
                {allSubjects.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSelectedSubject(s);
                      success('Đã đổi môn học', `Chuyển sang bảng điểm môn ${s}.`);
                      setShowAddSubjectPrompt(false);
                    }}
                    className={`text-xs px-3 py-1.5 rounded-xl font-semibold border transition-all ${
                      selectedSubject === s
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white hover:bg-blue-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddSubjectPrompt(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
