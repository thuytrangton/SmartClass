import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CalendarCheck,
  TrendingUp,
  Award,
  BookOpen,
  MessageSquare,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Send,
  Star
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/db';
import { PageHeader, StatCard } from '../../components/common/UIComponents';

export const ParentDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Child: Nguyễn Minh Quân
  const child = db.getStudentById('std-10a1-01') || db.getStudents()[0];
  const grades = db.getGradesByStudent(child.id);
  const assignments = db.getAssignments(child.classId);
  const alerts = db.getAlerts().filter((a) => a.studentId === child.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Cổng Phụ Huynh - Chào bác ${currentUser?.name || 'Nguyễn Văn Hùng'}`}
        subtitle={`Theo dõi việc học và chuyên cần của con: ${child.fullName} (Lớp ${child.className})`}
        badge="Sổ Liên Lạc Điện Tử"
      >
        <button
          onClick={() => navigate('/parent/messages')}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
        >
          <MessageSquare className="w-4 h-4" />
          Nhắn tin cho GVCN
        </button>
      </PageHeader>

      {/* Child Summary Hero Card */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <img
            src={child.avatar}
            alt={child.fullName}
            className="w-18 h-18 rounded-2xl object-cover ring-4 ring-white/20 shadow-md"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-black">{child.fullName}</h3>
              <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-bold backdrop-blur-xs">
                {child.className}
              </span>
            </div>
            <p className="text-xs text-blue-100 mt-1">
              GVCN: Cô Trần Thị Mai • Phòng 201 - Tòa A • THPT Chuyên Nguyễn Huệ
            </p>
            <div className="mt-2 flex items-center gap-3 text-xs text-emerald-300 font-semibold">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Điểm danh hôm nay: CÓ MẶT
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 text-center flex-1 md:flex-initial">
            <span className="text-[10px] uppercase font-bold text-blue-200 block">ĐTB Học kỳ 1</span>
            <span className="text-2xl font-black text-white">{child.gpa}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 text-center flex-1 md:flex-initial">
            <span className="text-[10px] uppercase font-bold text-blue-200 block">Hạnh kiểm</span>
            <span className="text-2xl font-black text-emerald-300">{child.conduct}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 text-center flex-1 md:flex-initial">
            <span className="text-[10px] uppercase font-bold text-blue-200 block">Sao rèn luyện</span>
            <span className="text-2xl font-black text-amber-300 flex items-center justify-center gap-1">
              <Star className="w-4 h-4 fill-amber-300 text-amber-300" /> {child.stars}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Teacher Remarks & Assignments */}
        <div className="lg:col-span-8 space-y-6">
          {/* Teacher Latest Remarks */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-600" />
                Sổ liên lạc & Nhận xét của Giáo viên chủ nhiệm
              </h4>
              <span className="text-xs text-slate-400">Cập nhật: Tuần 4</span>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 text-xs text-blue-900 space-y-2">
              <p className="leading-relaxed font-sans text-slate-800">
                "{child.notes || 'Em Quân học tập rất nghiêm túc, làm bài cẩn thận và luôn hòa đồng với bạn bè. Gia đình tiếp tục động viên em duy trì phong độ để thi học sinh giỏi.'}"
              </p>
              <div className="flex items-center justify-between pt-1 text-[11px] text-blue-600 font-semibold">
                <span>Cô Trần Thị Mai - GVCN Lớp 10A1</span>
                <span>SĐT: 0912 345 678</span>
              </div>
            </div>
          </div>

          {/* Child's Assignments Status */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-600" />
                Tình hình làm bài tập về nhà của con
              </h4>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                Đã nộp đầy đủ
              </span>
            </div>

            <div className="space-y-3">
              {assignments.slice(0, 2).map((asn) => (
                <div
                  key={asn.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <h5 className="font-bold text-slate-900">{asn.title}</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Môn {asn.subject} • Hạn nộp: {new Date(asn.dueDate).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold rounded-xl text-xs">
                    Điểm: 9.5 / 10
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Teacher Contact & Direct chat shortcut */}
        <div className="lg:col-span-4 space-y-6">
          {/* Teacher Contact Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h4 className="font-extrabold text-sm text-slate-900">Liên hệ Giáo viên chủ nhiệm</h4>
            <div className="flex items-center gap-3">
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
                alt="Cô Mai"
                className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-100"
              />
              <div>
                <h5 className="font-bold text-sm text-slate-800">Cô Trần Thị Mai</h5>
                <p className="text-xs text-slate-400">GVCN 10A1 • Môn Toán</p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <a
                href="tel:0912345678"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Phone className="w-3.5 h-3.5" /> Gọi điện: 0912 345 678
              </a>
              <button
                onClick={() => navigate('/parent/messages')}
                className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Nhắn tin qua hệ thống
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
