import { QuizQuestion } from '../types';

export interface LessonPlanResult {
  title: string;
  subject: string;
  gradeLevel: number;
  duration: string;
  objectives: {
    knowledge: string[];
    skills: string[];
    attitudes: string[];
  };
  activities: {
    phase: string;
    duration: string;
    teacherActivity: string;
    studentActivity: string;
  }[];
  assessment: string;
  homework: string;
}

export interface StudentFeedbackResult {
  overallRemark: string;
  strengths: string[];
  areasForImprovement: string[];
  actionRecommendation: string;
}

export const aiService = {
  /**
   * Sinh câu hỏi trắc nghiệm tự động theo chủ đề môn học
   */
  async generateQuizQuestions(
    subject: string,
    topic: string,
    gradeLevel: number,
    questionCount: number = 5,
    difficulty: 'Dễ' | 'Trung bình' | 'Khó' = 'Trung bình'
  ): Promise<QuizQuestion[]> {
    // Artificial slight async delay for realistic UX feeling
    await new Promise((r) => setTimeout(r, 600));

    const topicLower = topic.toLowerCase();
    const generated: QuizQuestion[] = [];

    if (subject.includes('Toán') || topicLower.includes('hàm số') || topicLower.includes('phương trình')) {
      const templates = [
        {
          question: `Cho hàm số y = ax² + bx + c (a ≠ 0). Tọa độ đỉnh I của đồ thị parabol là:`,
          options: ['I(-b/(2a); -Δ/(4a))', 'I(b/(2a); Δ/(4a))', 'I(-b/a; -c/a)', 'I(b/a; c/a)'],
          correct: 0,
          exp: 'Tọa độ đỉnh của parabol y = ax² + bx + c là I(-b/(2a); -Δ/(4a)).'
        },
        {
          question: `Điều kiện để tam thức bậc hai f(x) = ax² + bx + c luôn dương với mọi x ∈ R là:`,
          options: ['a > 0 và Δ < 0', 'a > 0 và Δ ≤ 0', 'a < 0 và Δ < 0', 'a > 0 và Δ > 0'],
          correct: 0,
          exp: 'Theo định lý về dấu tam thức bậc hai, f(x) > 0 với mọi x <=> a > 0 và Δ < 0.'
        },
        {
          question: `Phương trình x² - 5x + 6 = 0 có tập nghiệm là:`,
          options: ['S = {2; 3}', 'S = {-2; -3}', 'S = {1; 6}', 'S = {-1; -6}'],
          correct: 0,
          exp: 'Phân tích (x - 2)(x - 3) = 0 suy ra x = 2 hoặc x = 3.'
        },
        {
          question: `Độ dài vectơ u = (3; -4) trong mặt phẳng tọa độ Oxy là:`,
          options: ['5', '7', '1', '25'],
          correct: 0,
          exp: '|u| = √(3² + (-4)²) = √(9 + 16) = √25 = 5.'
        },
        {
          question: `Cho tam giác ABC có a = 6, b = 8, góc C = 60°. Độ dài cạnh c là:`,
          options: ['2√13', '10', '2√37', '8'],
          correct: 0,
          exp: 'Theo định lý cosin: c² = a² + b² - 2ab*cos(60°) = 36 + 64 - 2*6*8*0.5 = 52 => c = 2√13.'
        }
      ];

      for (let i = 0; i < Math.min(questionCount, templates.length); i++) {
        generated.push({
          id: `ai-q-${Date.now()}-${i}`,
          question: templates[i].question,
          options: templates[i].options,
          correctAnswerIndex: templates[i].correct,
          explanation: templates[i].exp,
          subject,
          gradeLevel,
          difficulty
        });
      }
    } else if (subject.includes('Văn')) {
      const templates = [
        {
          question: `Trong tác phẩm trữ tình, yếu tố nào đóng vai trò cốt lõi biểu hiện tư tưởng tình cảm?`,
          options: ['Cảm xúc và cái tôi trữ tình', 'Xung đột kịch tính', 'Hệ thống cốt truyện phức tạp', 'Chi tiết ngoại hình nhân vật'],
          correct: 0,
          exp: 'Tác phẩm trữ tình lấy cảm xúc và tâm trạng của chủ thể trữ tình làm trung tâm phản ánh.'
        },
        {
          question: `Biện pháp tu từ nào nổi bật trong câu thơ: "Tiếng suối trong như tiếng hát xa"?`,
          options: ['So sánh', 'Ẩn dụ chuyển đổi cảm giác', 'Hoán dụ', 'Điệp ngữ'],
          correct: 0,
          exp: 'Sử dụng từ so sánh "như" đối sánh âm thanh suối và tiếng hát.'
        },
        {
          question: `Tư tưởng xuyên suốt đoạn trích "Đất Nước" của Nguyễn Khoa Điềm là:`,
          options: ['Đất Nước của Nhân dân', 'Đất Nước của các bậc vua chúa', 'Đất Nước của thần thoại', 'Đất Nước trong tương lai'],
          correct: 0,
          exp: 'Nguyễn Khoa Điềm khám phá Đất Nước trên bình diện địa lý, lịch sử và văn hóa gắn liền với Nhân dân.'
        }
      ];

      for (let i = 0; i < Math.min(questionCount, templates.length); i++) {
        generated.push({
          id: `ai-q-${Date.now()}-${i}`,
          question: templates[i].question,
          options: templates[i].options,
          correctAnswerIndex: templates[i].correct,
          explanation: templates[i].exp,
          subject,
          gradeLevel,
          difficulty
        });
      }
    } else {
      // General subjects
      for (let i = 1; i <= questionCount; i++) {
        generated.push({
          id: `ai-q-${Date.now()}-${i}`,
          question: `Câu hỏi số ${i} về chuyên đề "${topic}" (Môn ${subject}, Lớp ${gradeLevel}): Nội dung nào đúng nhất?`,
          options: [
            `Khái niệm chuẩn xác nhất về ${topic} theo chương trình GDPT mới.`,
            `Phương án gây nhiễu A liên quan đến trường hợp đặc biệt.`,
            `Phương án gây nhiễu B liên quan đến sai số thực nghiệm.`,
            `Phương án gây nhiễu C chưa đủ điều kiện cần.`
          ],
          correctAnswerIndex: 0,
          explanation: `Giải thích chi tiết cho câu hỏi ${i} về ${topic}: Áp dụng đúng công thức và khái niệm cốt lõi.`,
          subject,
          gradeLevel,
          difficulty
        });
      }
    }

    return generated;
  },

  /**
   * Soạn giáo án (Kế hoạch bài dạy) chuẩn Công văn 5512
   */
  async generateLessonPlan(subject: string, topic: string, gradeLevel: number): Promise<LessonPlanResult> {
    await new Promise((r) => setTimeout(r, 700));

    return {
      title: `Kế hoạch bài dạy: ${topic}`,
      subject,
      gradeLevel,
      duration: '45 phút (1 tiết)',
      objectives: {
        knowledge: [
          `Hiểu rõ bản chất khái niệm và các định lý then chốt liên quan đến "${topic}".`,
          `Nắm vững quy trình vận dụng công thức vào giải quyết các dạng bài tập thực tiễn.`,
          `Nhận biết các lỗi sai phổ biến và cách phòng tránh khi làm bài kiểm tra.`
        ],
        skills: [
          'Rèn luyện kỹ năng phân tích, tổng hợp và tư duy logic phản biện.',
          'Kỹ năng làm việc nhóm, thuyết trình và giải thích thuật toán/luận điểm.',
          'Kỹ năng sử dụng đồ dùng học tập và phần mềm trực quan hỗ trợ.'
        ],
        attitudes: [
          'Chủ động, tích cực, sáng tạo và có trách nhiệm với nhiệm vụ được giao.',
          'Hình thành niềm yêu thích khám phá ứng dụng khoa học trong đời sống.'
        ]
      },
      activities: [
        {
          phase: '1. Khởi động (5 phút)',
          duration: '5 phút',
          teacherActivity: `Chiếu tình huống thực tế hoặc câu đố nhanh về ${topic} để kích thích sự tò mò của học sinh.`,
          studentActivity: 'Quan sát, suy ngẫm cá nhân trong 1 phút và thảo luận nhanh theo cặp.'
        },
        {
          phase: '2. Hình thành kiến thức (20 phút)',
          duration: '20 phút',
          teacherActivity: `Dẫn dắt các bước xây dựng công thức/định lý trọng tâm của ${topic}. Đặt các câu hỏi gợi mở.`,
          studentActivity: 'Lắng nghe, ghi chép vào vở học tập, giải thích lại định nghĩa bằng ngôn ngữ của bản thân.'
        },
        {
          phase: '3. Luyện tập & Vận dụng (15 phút)',
          duration: '15 phút',
          teacherActivity: 'Chia lớp thành 4 nhóm ngẫu nhiên, giao phiếu bài tập vận dụng cấp độ 1 và 2.',
          studentActivity: 'Các nhóm phối hợp giải quyết nhiệm vụ, cử đại diện báo cáo kết quả trên bảng phụ.'
        },
        {
          phase: '4. Vận dụng & Củng cố (5 phút)',
          duration: '5 phút',
          teacherActivity: 'Nhận xét chốt kiến thức, tổng kết điểm thi đua cho các nhóm hăng hái.',
          studentActivity: 'Ghi nhớ sơ đồ tư duy tóm tắt bài học và nhiệm vụ về nhà.'
        }
      ],
      assessment: 'Đánh giá qua quan sát thái độ làm việc nhóm, phiếu trả lời bài tập và câu hỏi trắc nghiệm nhanh cuối giờ.',
      homework: `Làm bài tập 1, 2, 3 trong SGK trang tiếp theo; Tìm kiếm 1 ứng dụng thực tế của ${topic} trong đời sống hàng ngày.`
    };
  },

  /**
   * Tạo nhận xét đánh giá học sinh tự động
   */
  async generateStudentFeedback(
    studentName: string,
    gpa: number,
    conduct: string,
    attendanceRate: number,
    stars: number,
    teacherNotes?: string
  ): Promise<StudentFeedbackResult> {
    await new Promise((r) => setTimeout(r, 500));

    let overall = '';
    const strengths: string[] = [];
    const areas: string[] = [];
    let action = '';

    if (gpa >= 8.5) {
      overall = `Em ${studentName} là học sinh xuất sắc, có năng lực tự học và tư duy sáng tạo rất cao. Luôn duy trì phong độ ổn định và là tấm gương sáng cho cả lớp.`;
      strengths.push('Học lực vượt trội, nắm bắt kiến thức nhanh nhạy và sâu sắc.');
      strengths.push(`Tỷ lệ chuyên cần đạt ${attendanceRate}%, chấp hành nội quy trường lớp rất tốt.`);
      strengths.push(`Tích lũy ${stars} sao thi đua, luôn nhiệt tình giúp đỡ bạn bè cùng tiến bộ.`);
      areas.push('Có thể chủ động thử sức ở các cuộc thi học thuật quy mô lớn hơn (HSG Thành phố, Olympic).');
      action = 'Khuyến khích em tiếp tục đào sâu các chuyên đề nâng cao và phát triển kỹ năng thuyết trình.';
    } else if (gpa >= 6.5) {
      overall = `Em ${studentName} có ý thức học tập tiến bộ, tiếp thu bài tốt nhưng cần rèn luyện thêm tính cẩn thận và kiên trì trong các bài toán/chuyên đề phức tạp.`;
      strengths.push('Thái độ lễ phép, hòa đồng với bạn bè, tích cực tham gia các phong trào chung.');
      strengths.push('Có tinh thần cầu tiến, biết lắng nghe nhận xét từ thầy cô.');
      areas.push('Đôi khi còn chủ quan khi làm bài kiểm tra dẫn đến mất điểm ở những câu hỏi cơ bản.');
      if (attendanceRate < 92) {
        areas.push('Cần lưu ý giữ gìn sức khỏe để không nghỉ học gián đoạn.');
      }
      action = 'Phụ huynh cùng giáo viên động viên em lập thời gian biểu ôn tập đều đặn tại nhà.';
    } else {
      overall = `Em ${studentName} có khả năng nhưng hiện tại chưa thực sự tập trung vào việc học, cần sự đồng hành sát sao hơn từ gia đình và nhà trường.`;
      strengths.push('Nhanh nhẹn, có tiềm năng phát triển nếu chăm chỉ đúng cách.');
      areas.push('Còn để quên bài tập về nhà và chưa chuẩn bị bài kỹ trước khi lên lớp.');
      areas.push(`Điểm trung bình hiện tại (${gpa}) đang dưới mức kỳ vọng.`);
      action = 'Giáo viên sẽ sắp xếp bạn kèm cặp và trao đổi định kỳ 2 tuần/lần với phụ huynh.';
    }

    if (teacherNotes) {
      strengths.push(`Đặc điểm riêng ghi nhận: "${teacherNotes}"`);
    }

    return {
      overallRemark: overall,
      strengths,
      areasForImprovement: areas,
      actionRecommendation: action
    };
  }
};
