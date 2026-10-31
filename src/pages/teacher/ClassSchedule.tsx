import React, { useState, useEffect, useRef } from 'react';
import {
  Edit3,
  Trash2,
  Undo2,
  Redo2,
  Upload,
  Download,
  Check,
  Plus,
  AlertCircle,
  Info,
  School,
  User,
  MapPin,
  Calendar
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useClass } from '../../contexts/ClassContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/db';
import { ScheduleItem } from '../../types';

// Thứ tự ngày tối đa trong tuần (tối đa 7 ngày từ Thứ 2 đến Chủ Nhật)
export const DAY_NAMES = [
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7',
  'Chủ Nhật'
];

// Helper tính giờ học mặc định: Bắt đầu lúc 07:00, mỗi tiết 45 phút, cộng dồn liên tục
export const formatDefaultPeriodTime = (index: number): string => {
  const startMinutes = 7 * 60 + index * 45;
  const endMinutes = startMinutes + 45;
  const formatHourMin = (total: number) => {
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };
  return `${formatHourMin(startMinutes)} - ${formatHourMin(endMinutes)}`;
};

export interface TimetableColumn {
  id: string; // Unique stable id (ví dụ: 'col_1', 'col_2')
}

export interface TimetableRow {
  id: string; // Unique stable id (ví dụ: 'row_1', 'row_2')
  timeRange: string; // Khung giờ: người dùng có thể sửa trực tiếp
}

export interface TimetableData {
  columns: TimetableColumn[];
  rows: TimetableRow[];
  cells: Record<string, string>; // key: `${rowId}_${colId}` -> text content
}

// Danh sách các đối tượng hỗ trợ cho 3 loại lịch
const SCHEDULE_TARGETS = {
  class: [
    { id: 'cls-10a1', name: 'Lớp 10A1 (Sĩ số 32 - Phòng A.302)' },
    { id: 'cls-10a2', name: 'Lớp 10A2 (Sĩ số 34 - Phòng A.304)' },
    { id: 'cls-11b1', name: 'Lớp 11B1 (Sĩ số 30 - Phòng B.201)' },
    { id: 'cls-12a1', name: 'Lớp 12A1 (Sĩ số 35 - Phòng A.401)' }
  ],
  teacher: [
    { id: 'tch-01', name: 'Cô Trần Thị Mai (Môn Toán)' },
    { id: 'tch-02', name: 'Thầy Lê Hoàng Nam (Môn Ngữ văn)' },
    { id: 'tch-03', name: 'Cô Nguyễn Thị Thu (Môn Tiếng Anh)' },
    { id: 'tch-04', name: 'Thầy Đỗ Quốc Huy (Môn Vật lý)' },
    { id: 'tch-05', name: 'Cô Phạm Mai Linh (Môn Hóa học)' }
  ],
  room: [
    { id: 'rom-201', name: 'Phòng học 201 (Khu A)' },
    { id: 'rom-202', name: 'Phòng học 202 (Khu A)' },
    { id: 'rom-301', name: 'Phòng học 301 (Khu B)' },
    { id: 'rom-lab-tin', name: 'Phòng Tin học 1 (40 máy)' },
    { id: 'rom-lab-lyhoa', name: 'Phòng Thực hành Lý - Hóa' },
    { id: 'rom-danang', name: 'Nhà thi đấu đa năng' }
  ]
};

// Dữ liệu mẫu ban đầu trực quan cho Lớp 10A1
const createInitialTableData = (targetKey: string): TimetableData => {
  const columns: TimetableColumn[] = [
    { id: 'col_1' },
    { id: 'col_2' },
    { id: 'col_3' },
    { id: 'col_4' },
    { id: 'col_5' }
  ];

  const rows: TimetableRow[] = [
    { id: 'row_1', timeRange: formatDefaultPeriodTime(0) },
    { id: 'row_2', timeRange: formatDefaultPeriodTime(1) },
    { id: 'row_3', timeRange: formatDefaultPeriodTime(2) },
    { id: 'row_4', timeRange: formatDefaultPeriodTime(3) },
    { id: 'row_5', timeRange: formatDefaultPeriodTime(4) }
  ];

  const cells: Record<string, string> = {};

  if (targetKey === 'class_cls-10a1') {
    cells['row_1_col_1'] = 'Chào cờ / Sinh hoạt đầu tuần\nSân trường';
    cells['row_2_col_1'] = 'Toán học (Đại số)\nCô Trần Thị Mai';
    cells['row_3_col_1'] = 'Toán học (Hình học)\nCô Trần Thị Mai';
    cells['row_4_col_1'] = 'Ngữ văn\nThầy Lê Hoàng Nam';
    cells['row_5_col_1'] = 'Ngữ văn\nThầy Lê Hoàng Nam';

    cells['row_1_col_2'] = 'Tiếng Anh\nCô Nguyễn Thị Thu';
    cells['row_2_col_2'] = 'Tiếng Anh\nCô Nguyễn Thị Thu';
    cells['row_3_col_2'] = 'Vật lý\nThầy Đỗ Quốc Huy';
    cells['row_4_col_2'] = 'Hóa học\nCô Phạm Mai Linh';
    cells['row_5_col_2'] = 'Sinh học\nThầy Vũ Minh';

    cells['row_1_col_3'] = 'Lịch sử\nCô Hoàng Lan';
    cells['row_2_col_3'] = 'Địa lý\nThầy Trần Bách';
    cells['row_3_col_3'] = 'Toán học\nCô Trần Thị Mai';
    cells['row_4_col_3'] = 'Tin học\nThầy Quốc Khánh';
    cells['row_5_col_3'] = 'Tin học\nThầy Quốc Khánh';

    cells['row_1_col_4'] = 'Ngữ văn\nThầy Lê Hoàng Nam';
    cells['row_2_col_4'] = 'Ngữ văn\nThầy Lê Hoàng Nam';
    cells['row_3_col_4'] = 'Tiếng Anh\nCô Nguyễn Thị Thu';
    cells['row_4_col_4'] = 'Giáo dục thể chất\nThầy Nguyễn Dũng';
    cells['row_5_col_4'] = 'Giáo dục thể chất\nThầy Nguyễn Dũng';

    cells['row_1_col_5'] = 'Hóa học\nCô Phạm Mai Linh';
    cells['row_2_col_5'] = 'Vật lý\nThầy Đỗ Quốc Huy';
    cells['row_3_col_5'] = 'GDCD / KT-PL\nCô Minh Hằng';
    cells['row_4_col_5'] = 'Công nghệ\nThầy Anh Tuấn';
    cells['row_5_col_5'] = 'Sinh hoạt lớp cuối tuần\nGVCN Mai';
  }

  return { columns, rows, cells };
};

export const ClassSchedule: React.FC = () => {
  const { selectedClassId, setSelectedClassId } = useClass();
  const { success, error, info } = useToast();

  // 3 Loại lịch: Lớp học / Giáo viên / Phòng học
  const [scheduleType, setScheduleType] = useState<'class' | 'teacher' | 'room'>('class');
  const [currentTargetId, setCurrentTargetId] = useState<string>(() => selectedClassId || 'cls-10a1');

  // Khóa định danh cho bảng dữ liệu hiện tại
  const storageKey = `smart_timetable_${scheduleType}_${currentTargetId}`;

  // Trạng thái bảng thời khóa biểu
  const [data, setData] = useState<TimetableData>(() => {
    try {
      const saved = localStorage.getItem(`smart_timetable_class_${selectedClassId || 'cls-10a1'}`);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return createInitialTableData(`class_${selectedClassId || 'cls-10a1'}`);
  });

  // Bản lưu chuẩn để kiểm tra thay đổi chưa lưu
  const [savedSnapshot, setSavedSnapshot] = useState<TimetableData>(() =>
    JSON.parse(JSON.stringify(data))
  );

  // Lịch sử Hoàn tác (Undo) và Làm lại (Redo)
  const [history, setHistory] = useState<TimetableData[]>([]);
  const [future, setFuture] = useState<TimetableData[]>([]);

  // Chế độ Chỉnh sửa & Chế độ Xóa
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isDeleteMode, setIsDeleteMode] = useState<boolean>(false);

  // Trạng thái đang chỉnh sửa trực tiếp ô nào: `${rowId}_${colId}` hoặc `time_${rowId}`
  const [activeCellKey, setActiveCellKey] = useState<string | null>(null);

  // Popup thông báo: "Không thể thêm cột vì một tuần chỉ có 7 ngày."
  const [showMaxColumnsModal, setShowMaxColumnsModal] = useState<boolean>(false);

  // Popup cảnh báo: "Bạn chưa lưu thay đổi" (Lưu hoặc Hủy)
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState<boolean>(false);
  const [pendingActionAfterModal, setPendingActionAfterModal] = useState<(() => void) | null>(null);

  // Input file Excel ẩn
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Kiểm tra có thay đổi chưa lưu hay không
  const hasUnsavedChanges = JSON.stringify(data) !== JSON.stringify(savedSnapshot);

  // Load dữ liệu khi thay đổi loại lịch hoặc target
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setData(parsed);
        setSavedSnapshot(JSON.parse(JSON.stringify(parsed)));
      } else {
        const initial = createInitialTableData(`${scheduleType}_${currentTargetId}`);
        setData(initial);
        setSavedSnapshot(JSON.parse(JSON.stringify(initial)));
      }
    } catch {
      const initial = createInitialTableData(`${scheduleType}_${currentTargetId}`);
      setData(initial);
      setSavedSnapshot(JSON.parse(JSON.stringify(initial)));
    }
    setHistory([]);
    setFuture([]);
    setIsEditing(false);
    setIsDeleteMode(false);
    setActiveCellKey(null);
  }, [storageKey]);

  // Cập nhật selectedClassId trong context nếu chuyển lớp
  useEffect(() => {
    if (scheduleType === 'class' && currentTargetId !== selectedClassId) {
      setSelectedClassId(currentTargetId);
    }
  }, [scheduleType, currentTargetId, selectedClassId, setSelectedClassId]);

  // Ghi nhận một thay đổi vào Undo stack
  const pushStateToHistory = (newData: TimetableData) => {
    setHistory((prev) => [...prev.slice(-30), JSON.parse(JSON.stringify(data))]);
    setFuture([]);
    setData(newData);
  };

  // Hoàn tác (Ctrl+Z)
  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    setFuture((prev) => [JSON.parse(JSON.stringify(data)), ...prev]);
    setHistory(newHistory);
    setData(previous);
  };

  // Làm lại (Ctrl+Y)
  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    setHistory((prev) => [...prev, JSON.parse(JSON.stringify(data))]);
    setFuture(newFuture);
    setData(next);
  };

  // Lắng nghe phím tắt Ctrl+Z và Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Nếu đang trong input/textarea và người dùng bấm Enter thì không can thiệp (Enter để xuống dòng)
      if (e.key === 'Enter') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))
      ) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, future, data]);

  // Bật/tắt chế độ Chỉnh sửa
  const handleToggleEdit = () => {
    if (isEditing) {
      // Nếu đang bật và người dùng muốn tắt:
      if (hasUnsavedChanges) {
        // Có thay đổi chưa lưu -> Hiển thị popup cảnh báo
        setPendingActionAfterModal(() => () => {
          setIsEditing(false);
          setIsDeleteMode(false);
          setActiveCellKey(null);
        });
        setShowUnsavedChangesModal(true);
        return;
      }
      setIsEditing(false);
      setIsDeleteMode(false);
      setActiveCellKey(null);
    } else {
      setIsEditing(true);
    }
  };

  // Bật/tắt chế độ Xóa (màu đỏ)
  const handleToggleDeleteMode = () => {
    setIsDeleteMode((prev) => !prev);
    setActiveCellKey(null);
  };

  // Bấm Lưu: Lưu toàn bộ thay đổi, tự động tắt chế độ "Chỉnh sửa", vô hiệu hóa cả 2 nút Hoàn tác/Làm lại
  const handleSave = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
      setSavedSnapshot(JSON.parse(JSON.stringify(data)));

      // Nếu đang là lịch lớp học, đồng bộ cả vào db.ts để các trang khác tự động cập nhật
      if (scheduleType === 'class') {
        const scheduleItems: ScheduleItem[] = [];
        data.rows.forEach((row, rIdx) => {
          const periodNum = rIdx + 1;
          const [startT = '07:00', endT = '07:45'] = row.timeRange.split('-').map((s) => s.trim());
          data.columns.forEach((col, cIdx) => {
            const dayNum = (cIdx + 2) as 2 | 3 | 4 | 5 | 6 | 7;
            const text = data.cells[`${row.id}_${col.id}`]?.trim() || '';
            if (text) {
              const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
              scheduleItems.push({
                id: `sch-${currentTargetId}-${dayNum}-${periodNum}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                dayOfWeek: dayNum,
                period: periodNum,
                startTime: startT,
                endTime: endT,
                subject: lines[0] || 'Môn học',
                className: SCHEDULE_TARGETS.class.find((c) => c.id === currentTargetId)?.name.split(' ')[1] || '10A1',
                classId: currentTargetId,
                teacherName: lines[1] || 'Giáo viên bộ môn',
                room: 'Phòng học'
              });
            }
          });
        });
        db.setClassSchedules(currentTargetId, scheduleItems);
      }

      setIsEditing(false);
      setIsDeleteMode(false);
      setActiveCellKey(null);
      setHistory([]);
      setFuture([]);
      success('Đã lưu thời khóa biểu thành công!');
    } catch {
      error('Không thể lưu dữ liệu thời khóa biểu!');
    }
  };

  // Xử lý modal "Bạn chưa lưu thay đổi": Chọn Lưu
  const handleConfirmSaveInModal = () => {
    handleSave();
    setShowUnsavedChangesModal(false);
    if (pendingActionAfterModal) {
      pendingActionAfterModal();
      setPendingActionAfterModal(null);
    }
  };

  // Xử lý modal "Bạn chưa lưu thay đổi": Chọn Hủy (khôi phục snapshot trước đó)
  const handleDiscardChangesInModal = () => {
    setData(JSON.parse(JSON.stringify(savedSnapshot)));
    setIsEditing(false);
    setIsDeleteMode(false);
    setActiveCellKey(null);
    setHistory([]);
    setFuture([]);
    setShowUnsavedChangesModal(false);
    info('Đã hủy bỏ các thay đổi chưa lưu.');
    if (pendingActionAfterModal) {
      pendingActionAfterModal();
      setPendingActionAfterModal(null);
    }
  };

  // Thêm cột (Thứ): Nếu quá 7 ngày (Chủ Nhật) thì chặn lại và hiện popup
  const handleAddColumn = (insertIndex?: number) => {
    if (data.columns.length >= 7) {
      setShowMaxColumnsModal(true);
      return;
    }

    const newColId = `col_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newColumns = [...data.columns];

    if (typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex <= newColumns.length) {
      newColumns.splice(insertIndex, 0, { id: newColId });
    } else {
      newColumns.push({ id: newColId });
    }

    pushStateToHistory({
      ...data,
      columns: newColumns
    });
  };

  // Thêm hàng (Tiết): Tự động tính thời gian mặc định cho tiết mới
  const handleAddRow = (insertIndex?: number) => {
    const newRowId = `row_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newRows = [...data.rows];
    const targetIdx =
      typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex <= newRows.length
        ? insertIndex
        : newRows.length;

    const newTime = formatDefaultPeriodTime(targetIdx);
    newRows.splice(targetIdx, 0, { id: newRowId, timeRange: newTime });

    pushStateToHistory({
      ...data,
      rows: newRows
    });
  };

  // Xóa 1 cột: Toàn bộ dữ liệu chữ của các cột còn lại giữ nguyên, chỉ tự động lùi tên các cột còn lại
  const handleDeleteColumn = (colId: string) => {
    if (data.columns.length <= 1) {
      error('Thời khóa biểu cần ít nhất 1 cột ngày!');
      return;
    }

    const newColumns = data.columns.filter((c) => c.id !== colId);
    // Giữ nguyên toàn bộ data cells của các cột còn lại
    pushStateToHistory({
      ...data,
      columns: newColumns
    });
  };

  // Xóa 1 hàng: Toàn bộ dữ liệu chữ của các hàng còn lại giữ nguyên, chỉ tự động đánh số lại Tiết 1, Tiết 2...
  const handleDeleteRow = (rowId: string) => {
    if (data.rows.length <= 1) {
      error('Thời khóa biểu cần ít nhất 1 tiết học!');
      return;
    }

    const newRows = data.rows.filter((r) => r.id !== rowId);
    pushStateToHistory({
      ...data,
      rows: newRows
    });
  };

  // Xóa nội dung một ô: Trả về rỗng (hiển thị -trống-)
  const handleClearCell = (cellKey: string) => {
    if (!data.cells[cellKey]) return; // Đã trống sẵn
    const newCells = { ...data.cells };
    delete newCells[cellKey];
    pushStateToHistory({
      ...data,
      cells: newCells
    });
  };

  // Click vào ô trong bảng
  const handleCellClick = (cellKey: string) => {
    if (isDeleteMode) {
      // Khi bật chế độ Xóa: click vào ô nào sẽ xóa ngay lập tức (xóa cả khi có chữ, không cần popup)
      handleClearCell(cellKey);
      return;
    }

    // Trải nghiệm nhập liệu giống MS Word: click vào ô sẽ hiện ngay con trỏ nháy | để gõ trực tiếp
    setActiveCellKey(cellKey);
    if (!isEditing) {
      setIsEditing(true);
    }
  };

  // Cập nhật giá trị ô tạm thời (sau khi gõ hoặc khi click ra ngoài)
  const handleUpdateCell = (cellKey: string, value: string) => {
    const trimmed = value.trim();
    const oldVal = data.cells[cellKey] || '';
    if (oldVal === value) return;

    const newCells = { ...data.cells };
    if (!trimmed) {
      delete newCells[cellKey];
    } else {
      newCells[cellKey] = value;
    }

    pushStateToHistory({
      ...data,
      cells: newCells
    });
  };

  // Cập nhật giờ học cho một hàng (người dùng click để sửa trực tiếp thời gian)
  const handleUpdateTimeRange = (rowId: string, newTime: string) => {
    const trimmed = newTime.trim();
    const row = data.rows.find((r) => r.id === rowId);
    if (!row || row.timeRange === trimmed) return;

    const newRows = data.rows.map((r) => (r.id === rowId ? { ...r, timeRange: trimmed } : r));
    pushStateToHistory({
      ...data,
      rows: newRows
    });
  };

  // Xuất file Excel (.xlsx)
  const handleExportExcel = () => {
    try {
      const targetLabel =
        SCHEDULE_TARGETS[scheduleType].find((t) => t.id === currentTargetId)?.name || 'Thời khóa biểu';

      // Tạo ma trận dữ liệu
      const headerRow = ['Tiết / Giờ', ...data.columns.map((_, idx) => DAY_NAMES[idx] || `Thứ ${idx + 2}`)];
      const rowsData = data.rows.map((row, rIdx) => {
        const periodStr = `Tiết ${rIdx + 1} (${row.timeRange})`;
        const rowCells = data.columns.map((col) => data.cells[`${row.id}_${col.id}`] || '-trống-');
        return [periodStr, ...rowCells];
      });

      const worksheet = XLSX.utils.aoa_to_sheet([
        [`THỜI KHÓA BIỂU - ${targetLabel.toUpperCase()}`],
        [],
        headerRow,
        ...rowsData
      ]);

      // Set column widths
      worksheet['!cols'] = [
        { wch: 22 },
        ...data.columns.map(() => ({ wch: 25 }))
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'ThoiKhoaBieu');

      const fileName = `Thoi_Khoa_Bieu_${currentTargetId}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      success('Xuất file Excel thành công!');
    } catch {
      error('Không thể xuất file Excel!');
    }
  };

  // Import Excel (.xlsx, .xls, .csv)
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawJson: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (!rawJson || rawJson.length === 0) {
          error('File Excel không có dữ liệu!');
          return;
        }

        // Tìm hàng tiêu đề chứa "Tiết" hoặc "Thứ"
        let headerRowIdx = -1;
        for (let i = 0; i < rawJson.length; i++) {
          const row = rawJson[i];
          if (row.some((cell: any) => typeof cell === 'string' && (cell.includes('Thứ') || cell.includes('Tiết')))) {
            headerRowIdx = i;
            break;
          }
        }

        if (headerRowIdx === -1) {
          headerRowIdx = 0; // fallback dòng đầu
        }

        const header = rawJson[headerRowIdx];
        const dayColsCount = Math.min(7, Math.max(1, header.length - 1));

        const newColumns: TimetableColumn[] = [];
        for (let c = 0; c < dayColsCount; c++) {
          newColumns.push({ id: `col_imp_${c + 1}` });
        }

        const newRows: TimetableRow[] = [];
        const newCells: Record<string, string> = {};

        const dataRows = rawJson.slice(headerRowIdx + 1).filter((r) => r.length > 0);
        const rowCount = Math.max(5, dataRows.length);

        for (let r = 0; r < rowCount; r++) {
          const rowId = `row_imp_${r + 1}`;
          const rawRow = dataRows[r] || [];
          let timeVal = formatDefaultPeriodTime(r);

          if (rawRow[0] && typeof rawRow[0] === 'string') {
            const match = rawRow[0].match(/\((.*?)\)/);
            if (match && match[1]) {
              timeVal = match[1];
            }
          }

          newRows.push({ id: rowId, timeRange: timeVal });

          for (let c = 0; c < dayColsCount; c++) {
            const cellVal = rawRow[c + 1];
            if (cellVal && typeof cellVal === 'string' && cellVal.trim() && cellVal.trim() !== '-trống-') {
              newCells[`${rowId}_${newColumns[c].id}`] = cellVal.trim();
            }
          }
        }

        pushStateToHistory({
          columns: newColumns,
          rows: newRows,
          cells: newCells
        });

        setIsEditing(true);
        success('Đã import thành công thời khóa biểu từ Excel!');
      } catch {
        error('Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng file!');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Chuyển loại lịch hoặc đối tượng lịch
  const handleSwitchTarget = (newType: 'class' | 'teacher' | 'room', newTargetId: string) => {
    if (hasUnsavedChanges) {
      setPendingActionAfterModal(() => () => {
        setScheduleType(newType);
        setCurrentTargetId(newTargetId);
      });
      setShowUnsavedChangesModal(true);
      return;
    }
    setScheduleType(newType);
    setCurrentTargetId(newTargetId);
  };

  return (
    <div className="space-y-6 rounded-3xl bg-[#080e1c] border border-slate-800/80 p-4 md:p-6 shadow-2xl text-slate-100">
      {/* Input file ẩn cho chức năng Import Excel */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleImportExcel}
      />

      {/* HEADER: Tiêu đề trang & Thanh chuyển đổi 3 loại lịch */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-cyan-950/70 border border-cyan-800/50 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-950/40">
              <Calendar className="w-5 h-5" />
            </span>
            <span>Thời khóa biểu</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Hỗ trợ xếp lịch theo lớp học, giáo viên giảng dạy và phòng chức năng
          </p>
        </div>

        {/* Bộ chọn 3 loại lịch: Lịch lớp học, Lịch giáo viên, Lịch phòng học */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-[#0f172a] p-1 border border-slate-800 shadow-inner">
            <button
              onClick={() => handleSwitchTarget('class', SCHEDULE_TARGETS.class[0].id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                scheduleType === 'class'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <School className="w-3.5 h-3.5" />
              Lịch lớp học
            </button>
            <button
              onClick={() => handleSwitchTarget('teacher', SCHEDULE_TARGETS.teacher[0].id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                scheduleType === 'teacher'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Lịch giáo viên
            </button>
            <button
              onClick={() => handleSwitchTarget('room', SCHEDULE_TARGETS.room[0].id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                scheduleType === 'room'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              Lịch phòng học
            </button>
          </div>

          {/* Dropdown chọn đối tượng cụ thể */}
          <select
            value={currentTargetId}
            onChange={(e) => handleSwitchTarget(scheduleType, e.target.value)}
            className="px-3.5 py-1.5 bg-[#0f172a] border border-slate-700/80 rounded-xl text-xs font-semibold text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 shadow-md cursor-pointer"
          >
            {SCHEDULE_TARGETS[scheduleType].map((target) => (
              <option key={target.id} value={target.id} className="bg-slate-900 text-slate-100">
                {target.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* MỤC 1: KHU VỰC THANH CHỨC NĂNG (TOP BAR) */}
      {/* Chỉ hiển thị đúng 6 nút chính nằm trên cùng một thanh ngang: */}
      {/* 1. Chỉnh sửa (khi bật xuất hiện thêm nút Lưu) */}
      {/* 2. Xóa (Màu đỏ, nằm cạnh nút Chỉnh sửa) */}
      {/* 3. Hoàn tác (Icon mũi tên trái) */}
      {/* 4. Làm lại (Icon mũi tên phải) */}
      {/* 5. Import Excel */}
      {/* 6. Xuất file */}
      <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-2.5 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Nhóm 6 nút chức năng chính trên 1 thanh ngang */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 1. Chỉnh sửa */}
            <div className="inline-flex items-center gap-1.5">
              <button
                onClick={handleToggleEdit}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isEditing
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-950/50 ring-2 ring-cyan-400/50'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
                title="Bật/tắt chế độ chỉnh sửa trực tiếp"
              >
                {isEditing ? (
                  <span className="relative flex h-2 w-2 mr-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-300"></span>
                  </span>
                ) : (
                  <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                )}
                <span>{isEditing ? 'Đang chỉnh sửa' : 'Chỉnh sửa'}</span>
              </button>

              {/* Nút Lưu: Chỉ xuất hiện khi đang bật chế độ Chỉnh sửa */}
              {isEditing && (
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-400/30 animate-in fade-in zoom-in-95 cursor-pointer"
                  title="Lưu toàn bộ thay đổi và tắt chế độ chỉnh sửa"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Lưu</span>
                </button>
              )}
            </div>

            {/* 2. Xóa (Màu đỏ, nằm cạnh nút Chỉnh sửa) */}
            <button
              onClick={handleToggleDeleteMode}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isDeleteMode
                  ? 'bg-rose-600 text-white ring-2 ring-rose-400 shadow-lg shadow-rose-950/50 animate-pulse'
                  : 'bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 border border-rose-800/60'
              }`}
              title="Khi bật: Click vào ô/hàng/cột nào sẽ xóa ngay lập tức mà không cần popup"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleteMode ? 'Đang xóa...' : 'Xóa'}</span>
            </button>

            {/* Vạch ngăn nhẹ */}
            <div className="h-6 w-px bg-slate-800 mx-1" />

            {/* 3. Hoàn tác (Icon mũi tên trái) */}
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                history.length > 0
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer'
                  : 'bg-slate-900/60 text-slate-600 border border-slate-800/60 cursor-not-allowed opacity-40'
              }`}
              title="Hoàn tác thao tác trước đó (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Hoàn tác</span>
            </button>

            {/* 4. Làm lại (Icon mũi tên phải) */}
            <button
              onClick={handleRedo}
              disabled={future.length === 0}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                future.length > 0
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer'
                  : 'bg-slate-900/60 text-slate-600 border border-slate-800/60 cursor-not-allowed opacity-40'
              }`}
              title="Làm lại thao tác vừa hoàn tác (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
              <span>Làm lại</span>
            </button>

            {/* Vạch ngăn nhẹ */}
            <div className="h-6 w-px bg-slate-800 mx-1" />

            {/* 5. Import Excel */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-xs cursor-pointer"
              title="Nhập dữ liệu thời khóa biểu từ file Excel (.xlsx, .csv)"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span>Import Excel</span>
            </button>

            {/* 6. Xuất file */}
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-xs cursor-pointer"
              title="Xuất bảng thời khóa biểu ra file Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Xuất file</span>
            </button>
          </div>

          {/* Thông báo trạng thái chế độ Xóa nếu đang bật */}
          {isDeleteMode && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/60 border border-rose-800 rounded-xl text-xs font-semibold text-rose-200 animate-in fade-in">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
              <span>Chế độ Xóa: Click vào bất kỳ ô, cột hoặc hàng nào để xóa tức thì</span>
            </div>
          )}
        </div>
      </div>

      {/* BANNER HƯỚNG DẪN KHI BẬT CHẾ ĐỘ CHỈNH SỬA (Viền Cyan, giải thích gõ trực tiếp, Enter xuống dòng, tự động giãn ô) */}
      {isEditing && (
        <div className="p-4 rounded-2xl bg-[#0b172d]/90 border border-cyan-500/50 shadow-xl shadow-cyan-950/30 text-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-400 flex items-center justify-center shrink-0 shadow-md shadow-cyan-950/50">
                <Info className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-xs">
                <div className="font-bold text-cyan-300 text-sm flex items-center gap-2">
                  <span>Chế độ chỉnh sửa đang bật</span>
                  <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/60">
                    Soạn thảo trực tiếp
                  </span>
                </div>
                <div className="text-slate-300 leading-relaxed space-y-0.5">
                  <p>
                    • <strong className="text-white">Gõ trực tiếp:</strong> Click vào ô để gõ chữ. Nhấn <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700 font-mono text-[11px]">Enter</kbd> để xuống dòng bên trong ô.
                  </p>
                  <p>
                    • <strong className="text-white">Tự động giãn ô:</strong> Chiều cao ô và toàn bộ hàng tự động giãn vừa vặn nội dung. Click ra ngoài để xác nhận tạm thời.
                  </p>
                  <p>
                    • <strong className="text-white">Thêm / Xóa:</strong> Rê chuột vào vạch giữa 2 cột / hàng để click icon dấu <strong className="text-cyan-400 font-mono">+</strong> thêm ngày / tiết. Click nút <strong className="text-emerald-400">Lưu</strong> màu xanh để hoàn tất.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-lg shadow-emerald-500/30 cursor-pointer"
                title="Lưu toàn bộ thay đổi và tắt chế độ chỉnh sửa"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Lưu thay đổi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KHU VỰC BẢNG THỜI KHÓA BIỂU */}
      <div className="relative overflow-x-auto rounded-2xl border border-slate-800 bg-[#0a1122] shadow-2xl">
        <table className="w-full table-fixed border-collapse">
          {/* HEADER ROW: Cột 1 là Tiết / Giờ; Từ Cột 2 trở đi là Thứ 2 đến Thứ 6 (hoặc mở rộng Thứ 7, CN) */}
          <thead>
            <tr className="bg-[#0d1a33] text-cyan-300 border-b border-slate-800 select-none">
              {/* CỘT 1: Tiết / Giờ */}
              <th className="w-36 md:w-44 p-3 text-left border-r border-slate-800 font-bold text-xs uppercase tracking-wider text-cyan-300 bg-[#0d1a33] sticky left-0 z-20">
                <div className="flex items-center justify-between">
                  <span>Tiết / Giờ</span>
                  {/* Trong chế độ Chỉnh sửa: Có thể click thêm hàng nhanh */}
                  {isEditing && (
                    <button
                      onClick={() => handleAddRow(data.rows.length)}
                      className="p-1 hover:bg-cyan-900/50 text-cyan-400 rounded transition-all cursor-pointer"
                      title="Thêm hàng tiết mới ở dưới cùng"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </th>

              {/* TỪ CỘT 2: Tự động đặt tên Thứ (Thứ 2, Thứ 3...). Khóa hoàn toàn, không cho sửa tên Thứ */}
              {data.columns.map((col, colIndex) => {
                const dayLabel = DAY_NAMES[colIndex] || `Thứ ${colIndex + 2}`;
                return (
                  <th
                    key={col.id}
                    className={`relative p-3 text-center border-r border-slate-800 font-bold text-xs uppercase tracking-wider transition-colors group ${
                      isDeleteMode
                        ? 'bg-rose-950/60 text-rose-200 hover:bg-rose-900/70 cursor-pointer'
                        : 'text-cyan-200'
                    }`}
                    onClick={() => {
                      if (isDeleteMode) {
                        handleDeleteColumn(col.id);
                      }
                    }}
                    title={
                      isDeleteMode
                        ? `Click để xóa toàn bộ cột ${dayLabel}`
                        : `Tiêu đề cố định: ${dayLabel}`
                    }
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>{dayLabel}</span>

                      {/* Icon thùng rác khi bật chế độ Xóa */}
                      {isDeleteMode && (
                        <Trash2 className="w-3.5 h-3.5 text-rose-400 hover:scale-110" />
                      )}

                      {/* Nút xóa cột xuất hiện khi rê chuột trong chế độ Chỉnh sửa */}
                      {isEditing && !isDeleteMode && data.columns.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteColumn(col.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-rose-950/80 text-rose-400 hover:text-rose-300 rounded transition-all hover:scale-110 cursor-pointer"
                          title={`Xóa cột ${dayLabel}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Vạch ngăn cách giữa 2 cột: Hiển thị icon dấu + khi rê chuột trong chế độ Chỉnh sửa */}
                    {isEditing && !isDeleteMode && (
                      <div
                        className="absolute right-[-11px] top-0 bottom-0 w-6 flex items-center justify-center z-30 group/add cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddColumn(colIndex + 1);
                        }}
                        title={`Thêm cột sau ${dayLabel}`}
                      >
                        <div className="w-5 h-5 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center justify-center opacity-0 group-hover/add:opacity-100 shadow-lg shadow-cyan-400/50 hover:scale-125 transition-all font-bold">
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* BODY ROWS: 5 hàng ngang mặc định (tương ứng 5 tiết) */}
          <tbody>
            {data.rows.map((row, rowIndex) => {
              const periodLabel = `Tiết ${rowIndex + 1}`;
              const isEvenRow = rowIndex % 2 === 0;
              const rowBgClass = isEvenRow ? 'bg-[#0a1122]' : 'bg-[#0e172e]';

              return (
                <tr
                  key={row.id}
                  className={`border-b border-slate-800/80 transition-colors ${rowBgClass} hover:bg-[#132142]/80`}
                >
                  {/* CỘT 1 CỦA HÀNG: Tiết / Giờ */}
                  {/* Logic: Hệ thống tự đánh số Tiết 1, Tiết 2... (Khóa tên tiết). Người dùng click sửa trực tiếp thời gian */}
                  <td
                    className={`p-3 border-r border-slate-800 align-top transition-colors ${rowBgClass} ${
                      isDeleteMode
                        ? 'bg-rose-950/70 hover:bg-rose-900 cursor-pointer'
                        : ''
                    } sticky left-0 z-10`}
                    onClick={() => {
                      if (isDeleteMode) {
                        handleDeleteRow(row.id);
                      }
                    }}
                    title={
                      isDeleteMode
                        ? `Click để xóa hàng ${periodLabel}`
                        : undefined
                    }
                  >
                    <div className="flex flex-col gap-1 group/row">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white tracking-tight select-none">
                          {periodLabel}
                        </span>

                        {isDeleteMode && (
                          <Trash2 className="w-3.5 h-3.5 text-rose-400 hover:scale-110" />
                        )}

                        {/* Nút xóa hàng xuất hiện khi rê chuột trong chế độ Chỉnh sửa */}
                        {isEditing && !isDeleteMode && data.rows.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRow(row.id);
                            }}
                            className="opacity-0 group-hover/row:opacity-100 p-0.5 hover:bg-rose-950/80 text-rose-400 hover:text-rose-300 rounded transition-all hover:scale-110 cursor-pointer"
                            title={`Xóa hàng ${periodLabel}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Khung giờ: Người dùng có thể click để sửa trực tiếp thời gian */}
                      {activeCellKey === `time_${row.id}` ? (
                        <input
                          type="text"
                          defaultValue={row.timeRange}
                          autoFocus
                          onBlur={(e) => {
                            handleUpdateTimeRange(row.id, e.target.value);
                            setActiveCellKey(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateTimeRange(row.id, e.currentTarget.value);
                              setActiveCellKey(null);
                            }
                          }}
                          className="w-full text-[11px] font-semibold text-cyan-300 bg-slate-900 border border-cyan-500 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                        />
                      ) : (
                        <div
                          onClick={(e) => {
                            if (!isDeleteMode) {
                              e.stopPropagation();
                              setActiveCellKey(`time_${row.id}`);
                              if (!isEditing) setIsEditing(true);
                            }
                          }}
                          className={`text-[11px] font-semibold text-cyan-400/90 rounded px-1 py-0.5 transition-all ${
                            !isDeleteMode ? 'hover:bg-cyan-950/50 hover:text-cyan-300 cursor-pointer' : ''
                          }`}
                          title="Click để sửa khung thời gian"
                        >
                          {row.timeRange}
                        </div>
                      )}
                    </div>

                    {/* Vạch ngăn cách giữa 2 hàng: Hiển thị icon dấu + khi rê chuột trong chế độ Chỉnh sửa */}
                    {isEditing && !isDeleteMode && (
                      <div
                        className="absolute bottom-[-11px] left-0 right-0 h-6 flex items-center justify-center z-30 group/addrow cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddRow(rowIndex + 1);
                        }}
                        title={`Thêm hàng sau ${periodLabel}`}
                      >
                        <div className="w-5 h-5 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center justify-center opacity-0 group-hover/addrow:opacity-100 shadow-lg shadow-cyan-400/50 hover:scale-125 transition-all font-bold">
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      </div>
                    )}
                  </td>

                  {/* CÁC Ô NỘI DUNG MÔN HỌC */}
                  {/* Trải nghiệm nhập liệu giống MS Word: */}
                  {/* - Click vào ô hiện ngay con trỏ nháy | để gõ trực tiếp */}
                  {/* - Phím Enter để xuống dòng bên trong ô */}
                  {/* - Tự động giãn ô: cả hàng ngang đều giãn bằng nhau (table-layout) */}
                  {/* - Ô trống mặc định hiển thị: "-trống-" */}
                  {/* - Click ra ngoài áp dụng tạm thời, không phải Lưu */}
                  {data.columns.map((col) => {
                    const cellKey = `${row.id}_${col.id}`;
                    const cellValue = data.cells[cellKey] || '';
                    const isCellActive = activeCellKey === cellKey;

                    return (
                      <td
                        key={col.id}
                        onClick={() => handleCellClick(cellKey)}
                        className={`p-2.5 border-r border-slate-800/80 align-top transition-all ${
                          isDeleteMode
                            ? 'hover:bg-rose-950/70 cursor-pointer'
                            : isCellActive
                            ? 'bg-[#13254e] ring-2 ring-inset ring-cyan-400 shadow-inner'
                            : isEditing
                            ? 'hover:bg-[#13254e]/80 cursor-text hover:border-cyan-500/40'
                            : 'hover:bg-[#132142]/60 cursor-pointer'
                        }`}
                      >
                        {isCellActive && !isDeleteMode ? (
                          <EditableCellTextarea
                            initialValue={cellValue}
                            onCommit={(val) => {
                              handleUpdateCell(cellKey, val);
                              setActiveCellKey(null);
                            }}
                          />
                        ) : (
                          <div className="min-h-[58px] text-xs leading-relaxed whitespace-pre-wrap break-words">
                            {cellValue ? (
                              <span className="font-semibold text-slate-100">
                                {cellValue}
                              </span>
                            ) : (
                              <span className="text-slate-500 italic select-none">
                                -trống-
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* POPUP 1: "Không thể thêm cột vì một tuần chỉ có 7 ngày." */}
      {showMaxColumnsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[#0f172a] rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-700/80 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-800/50 text-amber-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white mb-1">
                  Giới hạn số ngày
                </h3>
                <p className="text-sm text-slate-300">
                  Không thể thêm cột vì một tuần chỉ có 7 ngày.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowMaxColumnsModal(false)}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-cyan-950/40"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP 2: "Bạn chưa lưu thay đổi" (Lưu hoặc Hủy) */}
      {showUnsavedChangesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[#0f172a] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-700/80 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-800/50 text-cyan-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white mb-1">
                  Bạn chưa lưu thay đổi
                </h3>
                <p className="text-sm text-slate-300">
                  Các thay đổi trên thời khóa biểu chưa được lưu vào hệ thống. Bạn có muốn lưu trước khi đóng chế độ chỉnh sửa?
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={handleDiscardChangesInModal}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmSaveInModal}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-cyan-950/40"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Component Textarea tự động co giãn chiều cao theo nội dung (như MS Word)
interface EditableCellProps {
  initialValue: string;
  onCommit: (val: string) => void;
}

const EditableCellTextarea: React.FC<EditableCellProps> = ({ initialValue, onCommit }) => {
  const [val, setVal] = useState(initialValue);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Focus ngay và đặt con trỏ ở cuối văn bản
  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
      ref.current.setSelectionRange(ref.current.value.length, ref.current.value.length);
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${Math.max(58, ref.current.scrollHeight)}px`;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setVal(e.target.value);
    adjustHeight();
  };

  return (
    <textarea
      ref={ref}
      value={val}
      onChange={handleChange}
      onBlur={() => onCommit(val)}
      onKeyDown={(e) => {
        // Enter xuống dòng bình thường bên trong ô (không lưu)
        if (e.key === 'Enter') {
          // Cho phép textarea tự xuống dòng, sau đó tính toán lại chiều cao
          setTimeout(adjustHeight, 10);
        }
      }}
      placeholder="-trống-"
      className="w-full min-h-[58px] p-0 resize-none bg-transparent text-xs font-semibold text-slate-100 focus:outline-none leading-relaxed placeholder:text-slate-500 placeholder:italic"
      style={{ overflow: 'hidden' }}
    />
  );
};
