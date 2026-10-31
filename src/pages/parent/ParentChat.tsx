import React, { useState } from 'react';
import {
  Send,
  MessageSquare,
  User,
  Phone,
  Clock,
  CheckCheck
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/db';
import { PageHeader } from '../../components/common/UIComponents';

export const ParentChat: React.FC = () => {
  const { currentUser } = useAuth();
  const [inputText, setInputText] = useState('');

  // Parent: usr-parent-01, Teacher: usr-teacher-01
  const parentId = 'usr-parent-01';
  const teacherId = 'usr-teacher-01';

  const messages = db.getMessages(parentId, teacherId);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    db.sendMessage({
      senderId: parentId,
      senderName: currentUser?.name || 'Nguyễn Văn Hùng (Phụ huynh)',
      senderRole: 'parent',
      receiverId: teacherId,
      receiverName: 'Cô Trần Thị Mai',
      content: inputText.trim()
    });

    setInputText('');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Trao đổi Trực tiếp với Giáo viên Chủ nhiệm"
        subtitle="Kênh thông tin riêng tư giữa Gia đình học sinh và Cô Trần Thị Mai"
      />

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col h-[600px]">
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
              alt="Cô Mai"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-100"
            />
            <div>
              <h4 className="font-extrabold text-sm text-slate-900">Cô Trần Thị Mai</h4>
              <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Trực tuyến
              </p>
            </div>
          </div>

          <a
            href="tel:0912345678"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Phone className="w-3.5 h-3.5 text-blue-600" /> Gọi trực tiếp
          </a>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/50">
          {messages.map((m) => {
            const isMe = m.senderId === parentId;

            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-md p-4 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-xs'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                  }`}
                >
                  <p className="font-semibold">{m.content}</p>
                  <div
                    className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${
                      isMe ? 'text-blue-100' : 'text-slate-400'
                    }`}
                  >
                    <span>{m.timestamp}</span>
                    {isMe && <CheckCheck className="w-3 h-3 text-blue-200" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-200 bg-white flex items-center gap-2">
          <input
            type="text"
            placeholder="Nhập nội dung trao đổi với cô giáo..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 text-xs px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all"
          />
          <button
            type="submit"
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            Gửi
          </button>
        </form>
      </div>
    </div>
  );
};
