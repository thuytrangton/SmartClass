import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
  Phone,
  MessageSquare,
  Filter,
  Check,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown
} from 'lucide-react';
import { useClass } from '../../contexts/ClassContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/db';
import { SmartAlert, AlertStatus } from '../../types';
import { PageHeader, StatusChip, Modal } from '../../components/common/UIComponents';

export const SmartAlerts: React.FC = () => {
  const { selectedClassId, selectedClass } = useClass();
  const { success } = useToast();
  const navigate = useNavigate();

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  // Track Open/Close for each alert item
  const [openAlertIds, setOpenAlertIds] = useState<Record<string, boolean>>({
    'alt-01': true // open first by default
  });

  const toggleAlertOpen = (id: string) => {
    setOpenAlertIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleExpandAll = () => {
    const updated: Record<string, boolean> = {};
    alerts.forEach((a) => {
      updated[a.id] = true;
    });
    setOpenAlertIds(updated);
  };

  const handleCollapseAll = () => {
    setOpenAlertIds({});
  };

  // Resolve modal state
  const [resolvingAlert, setResolvingAlert] = useState<SmartAlert | null>(null);
  const [resolveNote, setResolveNote] = useState('Đã gọi điện trao đổi với phụ huynh và học sinh cam kết khắc phục.');

  const alerts = db.getAlerts().filter((a) => a.classId === selectedClassId);

  const filteredAlerts = alerts.filter((a) => {
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    const matchSeverity = filterSeverity === 'all' || a.severity === filterSeverity;
    return matchStatus && matchSeverity;
  });

  const isAllOpen = filteredAlerts.length > 0 && filteredAlerts.every((a) => openAlertIds[a.id]);

  const handleUpdateStatus = (id: string, status: AlertStatus) => {
    db.updateAlertStatus(id, status);
    success('Cập nhật trạng thái cảnh báo!', `Đã chuyển sang: ${status.toUpperCase()}`);
  };

  const handleConfirmResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingAlert) return;

    db.updateAlertStatus(resolvingAlert.id, 'resolved', resolveNote);
    success('Đã giải quyết cảnh báo!', 'Cảnh báo đã được đánh dấu hoàn thành kèm ghi chú.');
    setResolvingAlert(null);
  };

  const statusWorkflow: { id: AlertStatus; label: string; badge: string }[] = [
    { id: 'new', label: '1. Mới ghi nhận', badge: 'bg-rose-100 text-rose-800' },
    { id: 'viewed', label: '2. Đã xem', badge: 'bg-blue-100 text-blue-800' },
    { id: 'processing', label: '3. Đang xử lý', badge: 'bg-amber-100 text-amber-800' },
    { id: 'resolved', label: '4. Đã giải quyết', badge: 'bg-emerald-100 text-emerald-800' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Cảnh báo Thông minh - Lớp ${selectedClass?.name || '10A1'}`}
        subtitle="Hệ thống tự động phát hiện nguy cơ học tập, chuyên cần • Click để Mở ra/Đóng lại chi tiết xử lý"
      >
        <button
          onClick={isAllOpen ? handleCollapseAll : handleExpandAll}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all shadow-xs"
        >
          <ChevronsUpDown className="w-4 h-4 text-blue-600" />
          <span>{isAllOpen ? 'Đóng tất cả cảnh báo' : 'Mở tất cả cảnh báo'}</span>
        </button>
      </PageHeader>

      {/* Workflow Explanation Banner */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <span className="text-xs font-bold text-slate-700">Quy trình xử lý chuẩn 4 bước:</span>
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {statusWorkflow.map((step, idx) => (
            <React.Fragment key={step.id}>
              <span className={`px-2.5 py-1 rounded-lg font-bold ${step.badge}`}>{step.label}</span>
              {idx < statusWorkflow.length - 1 && <span className="text-slate-300">→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium outline-none"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="new">Mới ghi nhận</option>
          <option value="viewed">Đã xem</option>
          <option value="processing">Đang xử lý</option>
          <option value="resolved">Đã giải quyết</option>
        </select>

        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium outline-none"
        >
          <option value="all">Tất cả mức độ</option>
          <option value="critical">Khẩn cấp</option>
          <option value="warning">Cảnh báo</option>
          <option value="info">Thông tin</option>
        </select>
      </div>

      {/* Alerts List with Open / Close Toggle */}
      <div className="space-y-3.5">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 text-xs text-slate-400">
            Không có cảnh báo nào trong trạng thái đã chọn.
          </div>
        ) : (
          filteredAlerts.map((al) => {
            const isOpen = !!openAlertIds[al.id];

            return (
              <div
                key={al.id}
                className={`rounded-2xl border transition-all bg-white shadow-xs overflow-hidden ${
                  al.status === 'resolved' ? 'opacity-70 bg-slate-50/50' : 'hover:border-slate-300'
                }`}
              >
                {/* COMPACT ALERT HEADER (Click to Open/Close) */}
                <div
                  onClick={() => toggleAlertOpen(al.id)}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 transition-colors select-none"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        al.severity === 'critical'
                          ? 'bg-rose-100 text-rose-600'
                          : al.severity === 'warning'
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-blue-100 text-blue-600'
                      }`}
                    >
                      <ShieldAlert className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-sm text-slate-900">{al.title}</h4>
                        <StatusChip status={al.severity} />
                        <span
                          className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                            statusWorkflow.find((s) => s.id === al.status)?.badge
                          }`}
                        >
                          {al.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Học sinh: <strong className="text-blue-700">{al.studentName}</strong> ({al.className}) • {new Date(al.createdAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-auto" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => toggleAlertOpen(al.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                        isOpen
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                      }`}
                    >
                      <span>{isOpen ? 'Đóng chi tiết' : 'Mở chi tiết'}</span>
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* NESTED DETAILS & RESOLUTION ACTIONS (Open on Click 1, Close on Click 2) */}
                {isOpen && (
                  <div className="border-t border-slate-200 bg-slate-50/60 p-4 md:p-6 animate-in slide-in-from-top-1 fade-in duration-150 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs">
                      <span className="font-bold text-slate-800">Chi tiết cảnh báo & Hành động xử lý</span>
                      <button
                        onClick={() => toggleAlertOpen(al.id)}
                        className="text-slate-500 hover:text-rose-600 font-bold"
                      >
                        ✕ Đóng màn hình này
                      </button>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                      <p className="text-slate-700 leading-relaxed">
                        <strong>Nội dung cảnh báo:</strong> {al.description}
                      </p>

                      <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
                        <strong className="block mb-1">Gợi ý hành động từ hệ thống:</strong>
                        <p>{al.suggestedAction}</p>
                      </div>

                      {al.resolvedNote && (
                        <div className="p-3 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200">
                          <strong>Kết quả đã giải quyết:</strong> {al.resolvedNote} ({new Date(al.resolvedAt || '').toLocaleString('vi-VN')})
                        </div>
                      )}
                    </div>

                    {/* Workflow Actions */}
                    <div className="flex items-center justify-end gap-2 flex-wrap pt-1">
                      {al.status === 'new' && (
                        <button
                          onClick={() => handleUpdateStatus(al.id, 'viewed')}
                          className="px-3.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors"
                        >
                          Đánh dấu đã xem
                        </button>
                      )}

                      {(al.status === 'new' || al.status === 'viewed') && (
                        <button
                          onClick={() => handleUpdateStatus(al.id, 'processing')}
                          className="px-3.5 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl text-xs font-bold transition-colors"
                        >
                          Chuyển sang: Đang xử lý
                        </button>
                      )}

                      {al.status !== 'resolved' && (
                        <button
                          onClick={() => {
                            setResolvingAlert(al);
                            setResolveNote('Đã liên hệ phụ huynh và giải quyết thỏa đáng.');
                          }}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Đánh dấu: Đã giải quyết
                        </button>
                      )}

                      <button
                        onClick={() => navigate(`/teacher/students/${al.studentId}`)}
                        className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-medium"
                      >
                        Mở hồ sơ 360°
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Resolve Modal */}
      <Modal
        isOpen={!!resolvingAlert}
        onClose={() => setResolvingAlert(null)}
        title="Xác nhận Giải quyết Cảnh báo"
        subtitle={`Cảnh báo: ${resolvingAlert?.title} (${resolvingAlert?.studentName})`}
      >
        <form onSubmit={handleConfirmResolve} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú kết quả xử lý *
            </label>
            <textarea
              rows={3}
              required
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              placeholder="VD: Đã trao đổi với phụ huynh, học sinh cam kết không đi muộn..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setResolvingAlert(null)}
              className="px-4 py-2 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              Lưu & Hoàn tất
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
