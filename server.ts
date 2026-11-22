import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY chưa được cấu hình. Vui lòng kiểm tra khóa API trong bảng Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '5mb' }));

  // 1. Endpoint cho nút [Auto Tạo câu hỏi] theo danh sách chủ đề được chọn
  app.post('/api/gemini/auto-generate-topic-questions', async (req, res) => {
    try {
      const {
        subject = 'Toán học',
        gradeLevel = 10,
        topics = [],
        objectiveNeeded = 0,
        essayNeeded = 0,
        difficulty = 'all',
        extraInstruction = ''
      } = req.body || {};

      const totalObj = Math.max(0, Math.min(20, Number(objectiveNeeded) || 0));
      const totalEss = Math.max(0, Math.min(20, Number(essayNeeded) || 0));

      if (totalObj + totalEss === 0) {
        res.status(400).json({
          error: 'Số lượng câu hỏi cần tạo phải lớn hơn 0.'
        });
        return;
      }

      const topicList = Array.isArray(topics) && topics.length > 0
        ? topics
        : [{ name: 'Chủ đề trọng tâm', content: '', chapter: 'Chương 1' }];

      const sharePercent = Number((100 / topicList.length).toFixed(1));
      const topicsSummary = topicList
        .map((t: any, idx: number) => {
          const tObj = t.objectiveQuota !== undefined ? Number(t.objectiveQuota) : Math.round(totalObj / topicList.length);
          const tEss = t.essayQuota !== undefined ? Number(t.essayQuota) : Math.round(totalEss / topicList.length);
          const tShare = t.sharePercent !== undefined ? t.sharePercent : sharePercent;
          return `${idx + 1}. Chủ đề "${t.name}" (Tỷ lệ phân bổ: ${tShare}% — Cần tạo chính xác: ${tObj} câu Trắc nghiệm [single_choice] và ${tEss} câu Tự luận [essay] | Chương/Buổi: ${t.sessionLabel || t.chapter || 'Buổi 1'}): ${
            t.content ? t.content.slice(0, 1200) : 'Kiến thức trọng tâm theo chương trình GDPT 2018.'
          }`;
        })
        .join('\n');

      const difficultyNote =
        difficulty && difficulty !== 'all' && difficulty !== 'mixed'
          ? `Tất cả câu hỏi phải ở mức độ nhận thức: "${difficulty}".`
          : 'Phân bổ hợp lý các mức độ nhận thức: Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao.';

      const prompt = `Bạn là chuyên gia khảo thí và biên soạn đề thi THPT/THCS tại Việt Nam.
Hãy biên soạn chính xác tổng cộng:
- ${totalObj} câu hỏi Trắc nghiệm 4 lựa chọn (type = "single_choice")
- ${totalEss} câu hỏi Tự luận (type = "essay")
cho môn ${subject} (Khối ${gradeLevel}).

Danh sách ${topicList.length} chủ đề được chọn (Mỗi chủ đề đóng góp ${sharePercent}% tổng số câu hỏi — hãy tạo đúng số câu Trắc nghiệm và Tự luận đã chỉ định cho từng chủ đề):
${topicsSummary}

Yêu cầu chất lượng bắt buộc:
1. Trường "topicName" của mỗi câu hỏi PHẢI khớp chính xác với tên chủ đề tương ứng trong danh sách: ${topicList
        .map((t: any) => `"${t.name}"`)
        .join(', ')}, và đảm bảo đủ số lượng câu hỏi của từng chủ đề theo đúng tỷ lệ ${sharePercent}%.
2. ${difficultyNote}
3. Với câu Trắc nghiệm (type = "single_choice"):
   - Nội dung câu hỏi rõ ràng, bám sát kiến thức thực tế của chủ đề đó.
   - Bắt buộc có đúng 4 phương án A, B, C, D trong mảng "options", trong đó có ĐÚNG 1 phương án có isCorrect = true và 3 phương án nhiễu hợp lý (isCorrect = false). Không ghi câu chung chung.
4. Với câu Tự luận (type = "essay"):
   - Đề bài yêu cầu vận dụng, tính toán hoặc lập luận giải quyết vấn đề cụ thể thuộc chủ đề đó.
   - Trường "rubric" phải trình bày chi tiết từng bước giải và biểu điểm thành phần.
5. Trường "explanation" giải thích rõ phương pháp giải và đáp án đúng bằng tiếng Việt chuẩn mực.
${extraInstruction ? `6. Lưu ý bổ sung từ giáo viên: ${extraInstruction}` : ''}`;

      const ai = getGenAI();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'Bạn là hệ thống AI chuyên biên soạn câu hỏi kiểm tra đánh giá chất lượng cao theo chương trình giáo dục phổ thông Việt Nam. Luôn trả về đúng định dạng JSON theo schema.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topicName: {
                  type: Type.STRING,
                  description: 'Tên chủ đề của câu hỏi (khớp với chủ đề đã chọn).'
                },
                type: {
                  type: Type.STRING,
                  description: 'Loại câu hỏi: "single_choice" hoặc "essay".'
                },
                difficulty: {
                  type: Type.STRING,
                  description: 'Mức độ: "Nhận biết", "Thông hiểu", "Vận dụng", hoặc "Vận dụng cao".'
                },
                content: {
                  type: Type.STRING,
                  description: 'Nội dung đề bài câu hỏi chi tiết.'
                },
                options: {
                  type: Type.ARRAY,
                  description: '4 phương án A, B, C, D đối với câu trắc nghiệm single_choice.',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING },
                      text: { type: Type.STRING },
                      isCorrect: { type: Type.BOOLEAN }
                    },
                    required: ['label', 'text', 'isCorrect']
                  }
                },
                rubric: {
                  type: Type.STRING,
                  description: 'Hướng dẫn chấm và đáp án chi tiết đối với câu tự luận essay.'
                },
                explanation: {
                  type: Type.STRING,
                  description: 'Lời giải chi tiết của câu hỏi.'
                },
                tags: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ['topicName', 'type', 'difficulty', 'content', 'explanation']
            }
          }
        }
      });

      const rawText = (response.text ?? '[]').trim();
      const questions = JSON.parse(rawText);

      res.json({
        model: 'gemini-4-hydrogen',
        questions: Array.isArray(questions) ? questions : []
      });
    } catch (error: any) {
      console.error('Gemini auto-generate-topic-questions error:', error);
      const status = error?.status || 500;
      res.status(status).json({
        error:
          error?.message ||
          'Không thể gọi Gemini AI (gemini-4-hydrogen). Vui lòng kiểm tra khóa API trong Settings > Secrets.'
      });
    }
  });

  // 2. Endpoint cho Ngân hàng câu hỏi AI (QuizManager & questionBankService)
  app.post('/api/gemini/generate-questions', async (req, res) => {
    try {
      const config = req.body || {};
      const count = Math.max(1, Math.min(20, Number(config.count) || 5));
      const subject = config.subject || 'Toán học';
      const gradeLevel = config.gradeLevel || 10;
      const chapter = config.chapter || 'Chương 1';
      const topic = config.topic || 'Chủ đề trọng tâm';
      const questionType = config.questionType || 'mixed';
      const difficulty = config.difficulty || 'mixed';

      const prompt = `Bạn là chuyên gia khảo thí và biên soạn đề thi THPT/THCS Việt Nam.
Hãy tạo chính xác ${count} câu hỏi môn ${subject} lớp ${gradeLevel}.
- Chương/Bài: ${chapter}
- Chủ đề trọng tâm: ${topic}
- Dạng câu hỏi yêu cầu: ${
        questionType === 'mixed'
          ? 'Kết hợp các dạng (single_choice, multiple_choice, true_false, fill_blank, essay)'
          : questionType
      }
- Mức độ nhận thức: ${
        difficulty === 'mixed'
          ? 'Phân bổ từ Nhận biết, Thông hiểu đến Vận dụng'
          : difficulty
      }
${config.sourceMaterial ? `- Ngữ liệu / Tài liệu nguồn: ${config.sourceMaterial}` : ''}
${config.extraInstructions ? `- Yêu cầu bổ sung: ${config.extraInstructions}` : ''}

Lưu ý quan trọng:
- Với dạng single_choice: tạo 4 phương án A, B, C, D thực tế, rõ ràng và đúng 1 phương án isCorrect = true.
- Với dạng multiple_choice: tạo 4 phương án A, B, C, D và từ 2-3 phương án isCorrect = true.
- Với dạng true_false: tạo 4 mệnh đề a, b, c, d với trường isTrue (true/false).
- Với dạng fill_blank: cung cấp mảng acceptedAnswers chứa các cách ghi đáp án ngắn đúng.
- Với dạng essay: cung cấp hướng dẫn chấm chi tiết vào trường rubric.
- Luôn có giải thích chi tiết (explanation) bằng tiếng Việt chuẩn mực.`;

      const ai = getGenAI();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                difficulty: { type: Type.STRING },
                content: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING },
                      text: { type: Type.STRING },
                      isCorrect: { type: Type.BOOLEAN }
                    }
                  }
                },
                statements: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING },
                      content: { type: Type.STRING },
                      isTrue: { type: Type.BOOLEAN }
                    }
                  }
                },
                acceptedAnswers: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                rubric: { type: Type.STRING },
                explanation: { type: Type.STRING },
                tags: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ['type', 'difficulty', 'content', 'explanation']
            }
          }
        }
      });

      const parsed = JSON.parse((response.text ?? '[]').trim());
      res.json({
        model: 'gemini-4-hydrogen',
        questions: Array.isArray(parsed) ? parsed : []
      });
    } catch (error: any) {
      console.error('Gemini generate-questions error:', error);
      const status = error?.status || 500;
      res.status(status).json({
        error:
          error?.message ||
          'Lỗi khi gọi Gemini AI (gemini-4-hydrogen) trên server.'
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sigma Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
