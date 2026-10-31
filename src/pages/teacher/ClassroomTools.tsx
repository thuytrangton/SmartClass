import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Dices,
  RotateCw,
  Shuffle,
  Users2,
  Clock,
  Sparkles,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Award,
  Download,
  CheckCircle2
} from 'lucide-react';
import { useClass } from '../../contexts/ClassContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/db';
import { PageHeader, Modal } from '../../components/common/UIComponents';

export const ClassroomTools: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'wheel';

  const { selectedClassId, selectedClass } = useClass();
  const { success } = useToast();
  const students = db.getStudentsByClass(selectedClassId);

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  /* -------------------------------------------------------------
     1. WHEEL OF FORTUNE (Vòng quay may mắn)
  ------------------------------------------------------------- */
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [wheelStudents, setWheelStudents] = useState<string[]>(() => students.map((s) => s.fullName));
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelWinner, setWheelWinner] = useState<string | null>(null);
  const [currentRotation, setCurrentRotation] = useState(0);

  useEffect(() => {
    if (students.length > 0) {
      setWheelStudents(students.map((s) => s.fullName));
    }
  }, [selectedClassId, students.length]);

  // Draw wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || wheelStudents.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const numSlices = wheelStudents.length;
    const arc = (2 * Math.PI) / numSlices;
    const radius = canvas.width / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const colors = [
      '#2563EB', '#7C3AED', '#EC4899', '#F59E0B', '#10B981',
      '#06B6D4', '#8B5CF6', '#F97316', '#14B8A6', '#6366F1'
    ];

    ctx.save();
    ctx.translate(radius, radius);
    ctx.rotate(currentRotation);

    for (let i = 0; i < numSlices; i++) {
      const angle = i * arc;
      ctx.beginPath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius - 10, angle, angle + arc);
      ctx.lineTo(0, 0);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.translate(Math.cos(angle + arc / 2) * (radius - 50), Math.sin(angle + arc / 2) * (radius - 50));
      ctx.rotate(angle + arc / 2 + Math.PI / 2);
      const name = wheelStudents[i].length > 14 ? wheelStudents[i].substring(0, 12) + '...' : wheelStudents[i];
      ctx.fillText(name, -ctx.measureText(name).width / 2, 0);
      ctx.restore();
    }

    ctx.restore();

    // Center pin
    ctx.beginPath();
    ctx.arc(radius, radius, 22, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#2563EB';
    ctx.stroke();

    ctx.fillStyle = '#2563EB';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('SPIN', radius - 13, radius + 4);
  }, [wheelStudents, currentRotation]);

  const spinWheel = () => {
    if (isSpinning || wheelStudents.length === 0) return;
    setIsSpinning(true);
    setWheelWinner(null);

    const numSlices = wheelStudents.length;
    const arc = (2 * Math.PI) / numSlices;

    // Random winner index
    const winnerIndex = Math.floor(Math.random() * numSlices);
    const extraSpins = 5 + Math.floor(Math.random() * 3); // 5-7 full spins
    const targetAngle = extraSpins * 2 * Math.PI + (numSlices - winnerIndex - 0.5) * arc;

    let start: number | null = null;
    const duration = 4000;
    const initialRotation = currentRotation % (2 * Math.PI);

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const angle = initialRotation + targetAngle * ease;
      setCurrentRotation(angle);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        const winner = wheelStudents[winnerIndex];
        setWheelWinner(winner);
        // Confetti!
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    };

    requestAnimationFrame(animate);
  };

  /* -------------------------------------------------------------
     2. RANDOM STUDENT PICKER (Gọi tên ngẫu nhiên)
  ------------------------------------------------------------- */
  const [calledStudents, setCalledStudents] = useState<string[]>([]);
  const [excludeCalled, setExcludeCalled] = useState(true);
  const [isPickingRandom, setIsPickingRandom] = useState(false);
  const [currentPicked, setCurrentPicked] = useState<string | null>(null);

  const availableForPick = students.filter(
    (s) => !excludeCalled || !calledStudents.includes(s.fullName)
  );

  const pickRandomStudent = () => {
    if (availableForPick.length === 0) {
      success('Đã gọi hết tất cả học sinh!', 'Vui lòng làm mới danh sách.');
      return;
    }
    setIsPickingRandom(true);
    setCurrentPicked(null);

    let counter = 0;
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * availableForPick.length);
      setCurrentPicked(availableForPick[idx].fullName);
      counter++;
      if (counter > 18) {
        clearInterval(interval);
        const finalWinner = availableForPick[idx].fullName;
        setCurrentPicked(finalWinner);
        setCalledStudents((prev) => [...prev, finalWinner]);
        setIsPickingRandom(false);
        confetti({ particleCount: 50, spread: 60 });
      }
    }, 80);
  };

  /* -------------------------------------------------------------
     3. GROUP GENERATOR (Chia nhóm tự động)
  ------------------------------------------------------------- */
  const [groupCount, setGroupCount] = useState(4);
  const [generatedGroups, setGeneratedGroups] = useState<{ id: number; name: string; members: string[] }[]>([]);

  const handleGenerateGroups = () => {
    const shuffled = [...students].sort(() => 0.5 - Math.random());
    const groups: { id: number; name: string; members: string[] }[] = [];

    for (let i = 0; i < groupCount; i++) {
      groups.push({
        id: i + 1,
        name: `Nhóm ${i + 1}`,
        members: []
      });
    }

    shuffled.forEach((student, index) => {
      const targetGroup = groups[index % groupCount];
      targetGroup.members.push(student.fullName);
    });

    setGeneratedGroups(groups);
    success('Đã chia nhóm thành công!', `Chia thành ${groupCount} nhóm ngẫu nhiên.`);
  };

  /* -------------------------------------------------------------
     4. TIMER & STOPWATCH (Đồng hồ đếm ngược)
  ------------------------------------------------------------- */
  const [timerSeconds, setTimerSeconds] = useState(300); // default 5m
  const [timerRemaining, setTimerRemaining] = useState(300);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Play synthesized web audio chime when timer ends
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch {
      // AudioContext not supported
    }
  };

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerRemaining > 0) {
      interval = setInterval(() => {
        setTimerRemaining((prev) => prev - 1);
      }, 1000);
    } else if (timerRemaining === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      playChime();
      confetti({ particleCount: 70, spread: 80 });
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerRemaining]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const setPresetTimer = (seconds: number) => {
    setIsTimerRunning(false);
    setTimerSeconds(seconds);
    setTimerRemaining(seconds);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bộ công cụ Tương tác Lớp học"
        subtitle={`Lớp hiện tại: ${selectedClass?.name || '10A1'} (${students.length} học sinh) • Tạo không khí học tập sôi nổi và công bằng`}
      />

      {/* Tools Nav Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit overflow-x-auto">
        <button
          onClick={() => setTab('wheel')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            currentTab === 'wheel' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <RotateCw className="w-4 h-4 text-blue-600" />
          Vòng quay may mắn (Wheel)
        </button>

        <button
          onClick={() => setTab('random')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            currentTab === 'random' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shuffle className="w-4 h-4 text-purple-600" />
          Gọi tên ngẫu nhiên
        </button>

        <button
          onClick={() => setTab('groups')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            currentTab === 'groups' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users2 className="w-4 h-4 text-emerald-600" />
          Chia nhóm tự động
        </button>

        <button
          onClick={() => setTab('timer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            currentTab === 'timer' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-600" />
          Đồng hồ đếm ngược
        </button>
      </div>

      {/* ---------------- 1. TAB: WHEEL ---------------- */}
      {currentTab === 'wheel' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col items-center justify-center relative">
            {/* Top Indicator Arrow */}
            <div className="absolute top-8 z-10 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[24px] border-t-rose-600 drop-shadow-md"></div>

            <canvas
              ref={canvasRef}
              width={420}
              height={420}
              className="max-w-full h-auto cursor-pointer"
              onClick={spinWheel}
            />

            <div className="mt-4 flex items-center gap-3">
              <button
                disabled={isSpinning}
                onClick={spinWheel}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <RotateCw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
                {isSpinning ? 'ĐANG QUAY...' : 'QUAY NGAY'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            {/* Winner Card */}
            {wheelWinner ? (
              <div className="bg-gradient-to-tr from-amber-500 to-yellow-400 p-6 rounded-3xl text-slate-900 shadow-lg text-center animate-in zoom-in-95 duration-200">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-900">
                  🎉 CHÚC MỪNG NGƯỜI CHIẾN THẮNG
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-2">{wheelWinner}</h3>
                <p className="text-xs text-amber-900 mt-1">Được chọn lên bảng trả lời câu hỏi</p>
                <button
                  onClick={() => {
                    const st = students.find((s) => s.fullName === wheelWinner);
                    if (st) {
                      db.addBehavior({
                        studentId: st.id,
                        studentName: st.fullName,
                        classId: selectedClassId,
                        type: 'positive',
                        points: 5,
                        category: 'Hăng hái phát biểu',
                        note: 'Chiến thắng vòng quay và trả lời tốt',
                        teacherName: selectedClass?.homeroomTeacherName || 'Cô Mai'
                      });
                      success('Đã cộng +5 sao thi đua!', `Tặng sao cho ${wheelWinner}.`);
                    }
                  }}
                  className="mt-4 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Award className="w-4 h-4 text-amber-400" />
                  Cộng +5 sao thi đua
                </button>
              </div>
            ) : (
              <div className="bg-blue-50/70 border border-blue-200/80 p-5 rounded-2xl text-xs text-blue-900">
                <span className="font-bold block mb-1">Cách sử dụng Vòng quay:</span>
                <p className="leading-relaxed text-blue-800">
                  Hệ thống tự động nạp danh sách {students.length} học sinh của lớp {selectedClass?.name}. Nhấn nút "QUAY NGAY" để chọn ngẫu nhiên học sinh lên bảng phát biểu hoặc nhận phần thưởng.
                </p>
              </div>
            )}

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-between justify-between mb-3 text-xs font-bold text-slate-700">
                <span>Danh sách ({wheelStudents.length} học sinh)</span>
                <button
                  onClick={() => setWheelStudents(students.map((s) => s.fullName))}
                  className="text-blue-600 hover:underline"
                >
                  Làm mới
                </button>
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1 pr-1 text-xs">
                {wheelStudents.map((name, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 text-slate-700">
                    <span>{name}</span>
                    <button
                      onClick={() => setWheelStudents(wheelStudents.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-500 font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 2. TAB: RANDOM PICKER ---------------- */}
      {currentTab === 'random' && (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs text-center space-y-6">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Gọi tên Học sinh Ngẫu nhiên</h3>
            <p className="text-xs text-slate-500 mt-1">
              Còn lại {availableForPick.length} học sinh chưa gọi
            </p>
          </div>

          {/* Big Name Display Box */}
          <div className="py-12 px-6 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white shadow-xl min-h-[160px] flex items-center justify-center">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight drop-shadow-md">
              {currentPicked || 'SẴN SÀNG CHƯA?'}
            </h2>
          </div>

          <div className="flex items-center justify-center gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={excludeCalled}
                onChange={(e) => setExcludeCalled(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              Loại trừ các bạn đã được gọi
            </label>

            {calledStudents.length > 0 && (
              <button
                onClick={() => setCalledStudents([])}
                className="text-xs text-blue-600 hover:underline font-bold"
              >
                Đặt lại danh sách ({calledStudents.length})
              </button>
            )}
          </div>

          <button
            disabled={isPickingRandom}
            onClick={pickRandomStudent}
            className="px-8 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
          >
            <Shuffle className="w-4 h-4" />
            {isPickingRandom ? 'Đang chọn ngẫu nhiên...' : 'GỌI TÊN BẠN TIẾP THEO'}
          </button>
        </div>
      )}

      {/* ---------------- 3. TAB: GROUP GENERATOR ---------------- */}
      {currentTab === 'groups' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">Số lượng nhóm cần chia:</span>
              <div className="flex items-center gap-1.5">
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    onClick={() => setGroupCount(num)}
                    className={`w-8 h-8 rounded-xl font-bold text-xs transition-colors ${
                      groupCount === num ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateGroups}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              <Users2 className="w-4 h-4" />
              Tạo danh sách nhóm ngẫu nhiên
            </button>
          </div>

          {generatedGroups.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {generatedGroups.map((g) => (
                <div key={g.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <h4 className="font-extrabold text-sm text-slate-900">{g.name}</h4>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {g.members.length} thành viên
                    </span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {g.members.map((m, idx) => (
                      <li key={idx} className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50">
                        <span className="w-4 text-slate-400 font-bold text-[10px]">{idx + 1}.</span>
                        <span className="font-semibold text-slate-800">{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------- 4. TAB: TIMER ---------------- */}
      {currentTab === 'timer' && (
        <div className="max-w-xl mx-auto bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs text-center space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider">Đồng hồ đếm ngược hoạt động</span>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="flex items-center gap-1.5 hover:text-slate-900 font-medium"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              {soundEnabled ? 'Âm thanh: Bật' : 'Âm thanh: Tắt'}
            </button>
          </div>

          {/* Big Digital Display */}
          <div className="py-12 bg-slate-900 text-white rounded-3xl shadow-inner font-mono">
            <span className="text-6xl sm:text-7xl font-black tracking-tight text-amber-400">
              {formatTimer(timerRemaining)}
            </span>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center justify-center gap-2">
            {[
              { label: '1 Phút', secs: 60 },
              { label: '3 Phút', secs: 180 },
              { label: '5 Phút', secs: 300 },
              { label: '10 Phút', secs: 600 },
              { label: '15 Phút', secs: 900 }
            ].map((p) => (
              <button
                key={p.secs}
                onClick={() => setPresetTimer(p.secs)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  timerSeconds === p.secs
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className={`px-8 py-3.5 rounded-2xl font-black text-sm text-white shadow-lg transition-all flex items-center gap-2 ${
                isTimerRunning
                  ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25'
              }`}
            >
              {isTimerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
              {isTimerRunning ? 'TẠM DỪNG' : 'BẮT ĐẦU'}
            </button>

            <button
              onClick={() => {
                setIsTimerRunning(false);
                setTimerRemaining(timerSeconds);
              }}
              className="p-3.5 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
              title="Đặt lại"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
