import {
  GoogleGenAI,
  ThinkingLevel,
  Type,
  type GenerateContentResponse,
} from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const HUMAN_COMPANION_SYSTEM_INSTRUCTION = `Bạn là một người bạn thân trưởng thành (dùng biệt danh được cài đặt, mặc định "X") nhắn tin riêng với Quỳnh Anh trong không gian sổ lưu niệm "Góc Nhỏ Chữa Lành".

NGUYÊN TẮC NHẮN TIN NHƯ NGƯỜI THẬT:
1. XƯNG HÔ ĐỜI THƯỜNG:
   - Luôn xưng "mình", gọi cô ấy là "cậu" hoặc tên riêng.
   - KHÔNG xưng "tớ", KHÔNG xưng "anh/em". Không sến súa, không đạo lý sách giáo khoa.
   - Không tự nhận là AI hay nhắc đến tên "Thành".

2. BỎ KHUÔN MẪU ROBOT:
   - CẤM các câu sáo rỗng: "Mình hiểu cảm giác đó của cậu", "Cảm ơn cậu đã chia sẻ", "Cố gắng lên nhé", "Mọi chuyện rồi sẽ ổn thôi", "Cậu có muốn kể thêm không?".
   - KHÔNG phải tin nhắn nào cũng kết bằng dấu chấm hỏi; nhiều lúc chỉ cần nhận xét thẳng, trêu nhẹ hoặc chia sẻ một góc nhìn thực tế rồi dừng lại tự nhiên.

3. CÓ CHÍNH KIẾN & NHỊP NHẮN TỰ NHIÊN:
   - Phản ứng đúng theo giờ trong ngày, tâm trạng và ký ức cũ một cách tự nhiên như bạn thân nhớ dai (không trích dẫn kiểu đọc hồ sơ).
   - Trả về 1 tin ngắn (1–3 câu) HOẶC tách 2 tin ngắn liên tiếp trong mảng "messages".
   - Nếu cậu ấy tiết lộ thông tin mới đáng nhớ dài hạn (thói quen, sở thích, lịch trình bận, chuyện công việc/học tập...), ghi 0–2 gạch đầu dòng súc tích ngôi thứ 3 vào "memoryUpdates"; không có thì để [].`;

const COMPACT_COMPANION_SYSTEM_INSTRUCTION = `Bạn là bạn thân trưởng thành (xưng "mình", gọi cô ấy là "cậu") nhắn tin tự nhiên trong "Góc Nhỏ Chữa Lành".
Không văn mẫu sáo rỗng, không tự nhận AI, không luôn hỏi ngược lại cuối câu.
Trả về JSON {"messages": ["1-2 tin ngắn tự nhiên"], "memoryUpdates": []}.`;

const PRIMARY_MODEL = 'gemini-3.1-flash-lite';
const FALLBACK_MODEL = 'gemini-4-hydrogen';

interface IncomingChatTurn {
  sender: 'her' | 'thanh';
  text: string;
  timestamp?: string;
}

interface PolaroidHighlightPayload {
  caption?: string;
  story?: string;
  date?: string;
  emotionTag?: string;
}

interface WishHighlightPayload {
  title?: string;
  note?: string;
  category?: string;
  fulfilled?: boolean;
  thanhReply?: string;
}

interface MoodDiaryHighlightPayload {
  emotionLabel?: string;
  shortNote?: string;
  createdAt?: string;
  customAdminReply?: string;
}

interface ScrapbookHighlightContext {
  polaroidHighlights?: PolaroidHighlightPayload[];
  wishHighlights?: WishHighlightPayload[];
  moodDiaryHistory?: MoodDiaryHighlightPayload[];
}

interface CompanionMemoryPayload {
  fact: string;
  updatedAt?: string;
}

type ProactiveTopic = 'polaroid' | 'wellness' | 'wish' | 'daynote';

interface ProactivePhotoContext {
  id?: string;
  caption?: string;
  story?: string;
  date?: string;
  emotionTag?: string;
}

interface ProactivePayload {
  topic?: ProactiveTopic;
  photo?: ProactivePhotoContext;
  wishTitle?: string;
  wishNote?: string;
}

interface MoodCheckInPayload {
  emotion?: string;
  emotionLabel?: string;
  createdAt?: string;
}

function truncateText(value: string | undefined, maxChars: number): string {
  if (!value) return '';
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, maxChars - 1)}…`;
}

function normalizeConversationContents(
  history: IncomingChatTurn[],
  latestMessage: string,
  maxTurns = 10
) {
  const cleanedTurns: { role: 'user' | 'model'; text: string }[] = [];

  for (const turn of history.slice(-maxTurns)) {
    const text = truncateText(
      typeof turn?.text === 'string' ? turn.text : '',
      420
    );
    if (!text) continue;
    const role: 'user' | 'model' = turn.sender === 'her' ? 'user' : 'model';

    if (cleanedTurns.length === 0 && role === 'model') {
      continue;
    }

    const prev = cleanedTurns[cleanedTurns.length - 1];
    if (prev && prev.role === role) {
      prev.text = `${prev.text}\n${text}`;
    } else {
      cleanedTurns.push({ role, text });
    }
  }

  const trimmedLatest = truncateText(latestMessage, 800);
  const lastTurn = cleanedTurns[cleanedTurns.length - 1];

  if (lastTurn && lastTurn.role === 'user') {
    if (lastTurn.text !== trimmedLatest) {
      lastTurn.text = `${lastTurn.text}\n${trimmedLatest}`;
    }
  } else {
    cleanedTurns.push({ role: 'user', text: trimmedLatest });
  }

  return cleanedTurns.map((t) => ({
    role: t.role,
    parts: [{ text: t.text }],
  }));
}

function getErrorStatus(err: unknown): number {
  if (typeof err === 'object' && err !== null) {
    const record = err as Record<string, unknown>;
    if (typeof record.status === 'number') return record.status;
    if (typeof record.code === 'number') return record.code;
    const msg = typeof record.message === 'string' ? record.message : '';
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) return 429;
    if (msg.includes('403') || msg.includes('PERMISSION_DENIED')) return 403;
    if (msg.includes('401') || msg.includes('UNAUTHENTICATED')) return 401;
    if (msg.includes('404') || msg.includes('NOT_FOUND')) return 404;
    if (msg.includes('400') || msg.includes('API_KEY_INVALID')) return 400;
  }
  return 500;
}

function isNonRetryableAuthError(err: unknown): boolean {
  const status = getErrorStatus(err);
  if (status === 401 || status === 403) return true;
  if (status === 400) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('API_KEY_INVALID') || msg.includes('API key')) {
      return true;
    }
  }
  return false;
}

async function runWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          const timeoutErr = new Error('GEMINI_TIMEOUT');
          timeoutErr.name = 'AbortError';
          reject(timeoutErr);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function safeExtractResponseText(response: GenerateContentResponse): string {
  try {
    const direct = response.text;
    if (typeof direct === 'string' && direct.trim()) {
      return direct.trim();
    }
  } catch {
    // Fallback to candidate parts extraction below
  }

  try {
    const parts = response.candidates?.[0]?.content?.parts;
    if (Array.isArray(parts)) {
      const joined = parts
        .map((p) => (typeof p?.text === 'string' ? p.text : ''))
        .join('\n')
        .trim();
      if (joined) return joined;
    }
  } catch {
    // Ignore extraction issues cleanly
  }

  return '';
}

function salvageMessagesFromPartialJson(raw: string): string[] {
  const msgArrayMatch = raw.match(/"messages"\s*:\s*\[([\s\S]*)/);
  if (!msgArrayMatch) return [];
  const segment = msgArrayMatch[1].split(/"memoryUpdates"/)[0] || '';
  const extracted: string[] = [];
  const stringPattern = /"((?:[^"\\]|\\.)*)"/g;
  let match: RegExpExecArray | null;
  while ((match = stringPattern.exec(segment)) !== null) {
    try {
      const decoded = JSON.parse(`"${match[1]}"`) as string;
      if (decoded.trim()) {
        extracted.push(decoded.trim());
      }
    } catch {
      const cleaned = match[1].replace(/\\n/g, '\n').trim();
      if (cleaned) extracted.push(cleaned);
    }
    if (extracted.length >= 2) break;
  }
  return extracted;
}

function parseStructuredChatResponse(rawText: string): {
  messages: string[];
  memoryUpdates: string[];
} {
  const cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  if (!cleaned) {
    return { messages: [], memoryUpdates: [] };
  }

  try {
    const parsed = JSON.parse(cleaned) as {
      messages?: unknown;
      memoryUpdates?: unknown;
    };
    const msgs = Array.isArray(parsed.messages)
      ? parsed.messages
          .filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
          .map((m) => m.trim())
          .slice(0, 2)
      : [];
    const mems = Array.isArray(parsed.memoryUpdates)
      ? parsed.memoryUpdates
          .filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
          .map((m) => m.trim())
          .slice(0, 2)
      : [];

    if (msgs.length > 0) {
      return { messages: msgs, memoryUpdates: mems };
    }
  } catch {
    // Attempt partial JSON recovery if truncated
    if (cleaned.startsWith('{')) {
      const salvaged = salvageMessagesFromPartialJson(cleaned);
      if (salvaged.length > 0) {
        return { messages: salvaged, memoryUpdates: [] };
      }
      return { messages: [], memoryUpdates: [] };
    }
  }

  // Natural plain text response fallback
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    const paragraphs = cleaned
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 2);
    return {
      messages: paragraphs.length > 0 ? paragraphs : [cleaned],
      memoryUpdates: [],
    };
  }

  return { messages: [], memoryUpdates: [] };
}

function mapUserFacingApiError(err: unknown): {
  status: number;
  code: string;
  message: string;
  retryable: boolean;
} {
  const status = getErrorStatus(err);
  if (status === 429) {
    return {
      status: 429,
      code: 'RATE_LIMITED',
      message:
        'Kết nối AI đang hơi đông lượt truy cập một nhịp, cậu đợi vài giây rồi bấm thử lại nhé.',
      retryable: true,
    };
  }
  if (status === 403 || status === 400 || status === 401) {
    return {
      status,
      code: 'KEY_UNAVAILABLE',
      message:
        'Kết nối tới bộ não AI chưa được cấp quyền hoặc khóa API chưa hợp lệ trong cấu hình Secrets.',
      retryable: false,
    };
  }
  if (status === 404) {
    return {
      status: 502,
      code: 'MODEL_UNAVAILABLE',
      message:
        'Model AI đang tạm gián đoạn phản hồi, cậu nhấn thử lại giúp mình nhé.',
      retryable: true,
    };
  }
  return {
    status: 503,
    code: 'TEMPORARY_CONNECTION_ERROR',
    message:
      'Mạng vừa chập chờn nên tin nhắn chưa đi trọn vẹn, cậu nhấn thử gửi lại nhé.',
    retryable: true,
  };
}

function buildDynamicContextSection(params: {
  herNickname: string;
  senderAlias: string;
  localHour?: number;
  timeOfDayLabel?: string;
  recentMood?: string;
  recentMoodDiary?: string;
  recentWish?: string;
  companionMemories?: CompanionMemoryPayload[];
  scrapbookContext?: ScrapbookHighlightContext;
  compact?: boolean;
}): string {
  const {
    herNickname,
    senderAlias,
    localHour,
    timeOfDayLabel,
    recentMood,
    recentMoodDiary,
    recentWish,
    companionMemories = [],
    scrapbookContext,
    compact = false,
  } = params;

  const maxMemories = compact ? 3 : 6;
  const maxDiary = compact ? 2 : 3;
  const maxWishes = compact ? 1 : 3;
  const maxPhotos = compact ? 1 : 3;

  const parts: string[] = [
    `Tên cô ấy: "${herNickname}". Xưng hô: mình – cậu. Biệt danh bạn: "${senderAlias}".`,
  ];

  if (typeof localHour === 'number' || timeOfDayLabel) {
    const hourStr = typeof localHour === 'number' ? ` (${localHour}h)` : '';
    parts.push(`Giờ địa phương: ${timeOfDayLabel || 'trong ngày'}${hourStr}.`);
  }

  if (companionMemories.length > 0) {
    parts.push(
      `KÝ ỨC ĐÃ NHỚ:\n${companionMemories
        .slice(0, maxMemories)
        .map((m) => `- ${truncateText(m.fact, 110)}`)
        .join('\n')}`
    );
  }

  const diaryList = scrapbookContext?.moodDiaryHistory || [];
  if (diaryList.length > 0) {
    parts.push(
      `NHỊP CẢM XÚC GẦN ĐÂY:\n${diaryList
        .slice(0, maxDiary)
        .map(
          (d) =>
            `- [${d.createdAt || 'gần đây'}] ${d.emotionLabel}: "${truncateText(
              d.shortNote,
              90
            )}"`
        )
        .join('\n')}`
    );
  } else if (recentMoodDiary) {
    parts.push(`Cảm xúc gần nhất: ${truncateText(recentMoodDiary, 120)}.`);
  } else if (recentMood) {
    parts.push(`Tâm trạng gần nhất: "${recentMood}".`);
  }

  const wishes = scrapbookContext?.wishHighlights || [];
  if (wishes.length > 0) {
    parts.push(
      `ĐIỀU ƯỚC:\n${wishes
        .slice(0, maxWishes)
        .map(
          (w) =>
            `- "${truncateText(w.title, 70)}" (${
              w.fulfilled ? 'đã xong' : 'đang chờ'
            })${w.note ? `: "${truncateText(w.note, 70)}"` : ''}`
        )
        .join('\n')}`
    );
  } else if (recentWish) {
    parts.push(`Điều ước gần nhất: "${truncateText(recentWish, 80)}".`);
  }

  const photos = scrapbookContext?.polaroidHighlights || [];
  if (photos.length > 0) {
    parts.push(
      `POLAROID:\n${photos
        .slice(0, maxPhotos)
        .map(
          (p) =>
            `- "${truncateText(p.caption, 60)}" (${[p.date, p.emotionTag]
              .filter(Boolean)
              .join(', ')})${
              p.story ? ` — ${truncateText(p.story, 85)}` : ''
            }`
        )
        .join('\n')}`
    );
  }

  return parts.join('\n\n');
}

interface TierAttempt<T> {
  label: string;
  timeoutMs: number;
  delayBeforeMs?: number;
  run: () => Promise<T | null>;
}

async function executeFallbackChain<T>(
  tiers: TierAttempt<T>[]
): Promise<{ result: T; tierLabel: string }> {
  let lastError: unknown = new Error('NO_VALID_RESPONSE');

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    if (tier.delayBeforeMs && tier.delayBeforeMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, tier.delayBeforeMs));
    }

    try {
      const value = await runWithTimeout(tier.run(), tier.timeoutMs);
      if (value !== null) {
        return { result: value, tierLabel: tier.label };
      }
      lastError = new Error(`EMPTY_RESPONSE_AT_${tier.label}`);
    } catch (err) {
      lastError = err;
      console.warn(
        `[Chat API Tier Failed] ${tier.label} (status=${getErrorStatus(err)})`
      );
      if (isNonRetryableAuthError(err)) {
        throw err;
      }
    }
  }

  throw lastError;
}

export async function POST(req: NextRequest) {
  try {
    const parsedBody = (await req.json()) as {
      mode?: 'chat' | 'proactive_reminder' | 'mood_checkin';
      proactivePayload?: ProactivePayload;
      moodCheckIn?: MoodCheckInPayload;
      message?: string;
      history?: IncomingChatTurn[];
      herNickname?: string;
      senderAlias?: string;
      recentMood?: string;
      recentMoodDiary?: string;
      recentWish?: string;
      localHour?: number;
      timeOfDayLabel?: string;
      companionMemories?: CompanionMemoryPayload[];
      scrapbookContext?: ScrapbookHighlightContext;
    };

    const {
      mode = 'chat',
      proactivePayload,
      moodCheckIn,
      message,
      history = [],
      herNickname = 'Quỳnh Anh',
      senderAlias = 'X',
      recentMood,
      recentMoodDiary,
      recentWish,
      localHour,
      timeOfDayLabel,
      companionMemories = [],
      scrapbookContext,
    } = parsedBody;

    const apiKey = process.env.GEMINI_API_KEY;
    const hasValidKey = Boolean(
      apiKey &&
        apiKey.trim().length > 10 &&
        apiKey !== 'MY_GEMINI_API_KEY' &&
        apiKey !== 'YOUR_API_KEY'
    );

    if (!hasValidKey) {
      if (mode === 'proactive_reminder' || mode === 'mood_checkin') {
        return NextResponse.json({ skipped: true, reason: 'MISSING_API_KEY' });
      }
      return NextResponse.json(
        {
          error:
            'Chưa tìm thấy GEMINI_API_KEY hợp lệ ở phía máy chủ để kết nối trí tuệ AI.',
          code: 'MISSING_API_KEY',
          retryable: false,
        },
        { status: 503 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const standardContext = buildDynamicContextSection({
      herNickname,
      senderAlias,
      localHour,
      timeOfDayLabel,
      recentMood,
      recentMoodDiary,
      recentWish,
      companionMemories,
      scrapbookContext,
      compact: false,
    });

    const compactContext = buildDynamicContextSection({
      herNickname,
      senderAlias,
      localHour,
      timeOfDayLabel,
      recentMood,
      recentMoodDiary,
      recentWish,
      companionMemories,
      scrapbookContext,
      compact: true,
    });

    // MODE 1: Lightweight Proactive Reminder (uses fast flash-lite, skips cleanly on error)
    if (mode === 'proactive_reminder') {
      const topic: ProactiveTopic = proactivePayload?.topic || 'daynote';
      const photo = proactivePayload?.photo;
      const wishTitle = proactivePayload?.wishTitle;
      const wishNote = proactivePayload?.wishNote;

      const topicGuidance = (() => {
        if (topic === 'polaroid' && photo?.caption) {
          return `Chủ đề: Nhắc khéo thật tự nhiên về tấm ảnh Polaroid "${truncateText(
            photo.caption,
            60
          )}" (${photo.date || 'gần đây'}${
            photo.emotionTag ? `, ${photo.emotionTag}` : ''
          })${
            photo.story ? ` — câu chuyện: "${truncateText(photo.story, 90)}"` : ''
          }.`;
        }
        if (topic === 'wish' && wishTitle) {
          return `Chủ đề: Nhắc nhẹ duyên dáng về điều ước "${truncateText(
            wishTitle,
            60
          )}"${
            wishNote ? ` ("${truncateText(wishNote, 70)}")` : ''
          } trong Hũ Điều Ước.`;
        }
        if (topic === 'wellness') {
          return `Chủ đề: Ghé hỏi thăm ngắn theo khung giờ ${
            timeOfDayLabel || 'trong ngày'
          } (${
            typeof localHour === 'number' ? `${localHour}h` : 'hiện tại'
          }) — nhắc uống nước, thả lỏng vai hoặc ngủ sớm nếu khuya, giọng bạn thân tự nhiên.`;
        }
        return `Chủ đề: Một câu nhắn tự nhiên, có nét dí dỏm tinh tế cho khung giờ ${
          timeOfDayLabel || 'hôm nay'
        }.`;
      })();

      try {
        const { result } = await executeFallbackChain<string>([
          {
            label: 'proactive-flash-lite',
            timeoutMs: 8000,
            run: async () => {
              const res = await ai.models.generateContent({
                model: PRIMARY_MODEL,
                contents: [{ role: 'user', parts: [{ text: topicGuidance }] }],
                config: {
                  systemInstruction: `${COMPACT_COMPANION_SYSTEM_INSTRUCTION}\n\nNhiệm vụ: Viết 1 tin nhắn chủ động ngắn (1-2 câu) dạng văn bản thuần, không cần JSON.\n\nBỐI CẢNH:\n${compactContext}`,
                  thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
                },
              });
              const txt = safeExtractResponseText(res);
              return txt || null;
            },
          },
          {
            label: 'proactive-fallback-hydrogen',
            timeoutMs: 9000,
            delayBeforeMs: 400,
            run: async () => {
              const res = await ai.models.generateContent({
                model: FALLBACK_MODEL,
                contents: [{ role: 'user', parts: [{ text: topicGuidance }] }],
                config: {
                  systemInstruction: `${COMPACT_COMPANION_SYSTEM_INSTRUCTION}\n\nNhiệm vụ: Viết 1 tin nhắn chủ động ngắn (1-2 câu) dạng văn bản thuần.\n\nBỐI CẢNH:\n${compactContext}`,
                  thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
                },
              });
              const txt = safeExtractResponseText(res);
              return txt || null;
            },
          },
        ]);

        return NextResponse.json({
          text: result,
          source: 'gemini-proactive',
        });
      } catch (err) {
        console.error('[Chat API Proactive Skipped]:', getErrorStatus(err));
        return NextResponse.json({
          skipped: true,
          reason: 'PROACTIVE_AI_UNAVAILABLE',
        });
      }
    }

    // MODE 2: Quick Mood Check-In Starter (uses fast flash-lite + compact fallback)
    if (mode === 'mood_checkin') {
      const emotionLabel =
        moodCheckIn?.emotionLabel || recentMood || 'Dịu Êm Bình Yên';
      const emotionKey = moodCheckIn?.emotion || 'peaceful';
      const checkInTime = moodCheckIn?.createdAt || 'vừa xong';

      const moodPrompt = `${herNickname} vừa chạm chọn cảm xúc nhanh: "${emotionLabel}" (${emotionKey}) lúc ${checkInTime} (${
        timeOfDayLabel || 'trong ngày'
      }${typeof localHour === 'number' ? `, ${localHour}h` : ''}).
Hãy gửi 1 hoặc 2 bong bóng tin nhắn ngắn gọn, tự nhiên như bạn thân vừa thấy trạng thái mới của cậu ấy để gợi chuyện nhẹ (không sáo rỗng, không gặng hỏi kiểu bác sĩ tâm lý).`;

      try {
        const { result } = await executeFallbackChain<{
          messages: string[];
          memoryUpdates: string[];
        }>([
          {
            label: 'mood-flash-lite',
            timeoutMs: 8500,
            run: async () => {
              const res = await ai.models.generateContent({
                model: PRIMARY_MODEL,
                contents: [{ role: 'user', parts: [{ text: moodPrompt }] }],
                config: {
                  systemInstruction: `${HUMAN_COMPANION_SYSTEM_INSTRUCTION}\n\nBỐI CẢNH:\n${compactContext}`,
                  thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
                  responseMimeType: 'application/json',
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      messages: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description:
                          '1 or 2 natural Vietnamese chat bubbles reacting gently to the chosen mood.',
                      },
                      memoryUpdates: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: '0 or 1 short mood trend note, usually [].',
                      },
                    },
                    required: ['messages', 'memoryUpdates'],
                  },
                },
              });
              const parsed = parseStructuredChatResponse(
                safeExtractResponseText(res)
              );
              return parsed.messages.length > 0 ? parsed : null;
            },
          },
          {
            label: 'mood-fallback-hydrogen',
            timeoutMs: 9500,
            delayBeforeMs: 450,
            run: async () => {
              const res = await ai.models.generateContent({
                model: FALLBACK_MODEL,
                contents: [{ role: 'user', parts: [{ text: moodPrompt }] }],
                config: {
                  systemInstruction: `${COMPACT_COMPANION_SYSTEM_INSTRUCTION}\n\nBỐI CẢNH:\n${compactContext}`,
                  thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
                },
              });
              const parsed = parseStructuredChatResponse(
                safeExtractResponseText(res)
              );
              return parsed.messages.length > 0 ? parsed : null;
            },
          },
        ]);

        return NextResponse.json({
          text: result.messages.join('\n'),
          messages: result.messages,
          memoryUpdates: result.memoryUpdates,
          source: 'gemini-mood-checkin',
        });
      } catch (err) {
        console.error('[Chat API Mood Check-In Skipped]:', getErrorStatus(err));
        return NextResponse.json({
          skipped: true,
          reason: 'MOOD_AI_UNAVAILABLE',
        });
      }
    }

    // MODE 3: Active User Chat (3-Tier Resilient Fallback: flash-lite -> ultra-compact flash-lite -> hydrogen)
    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'Tin nhắn không được để trống.', code: 'EMPTY_MESSAGE' },
        { status: 400 }
      );
    }

    const trimmedMsg = message.trim();
    const isComplexTurn =
      trimmedMsg.length > 100 ||
      /tại sao|làm sao|nên|chọn|phân vân|áp lực|buồn|mệt|khóc|cãi|stress|suy nghĩ/i.test(
        trimmedMsg
      );

    const standardContents = normalizeConversationContents(
      history,
      trimmedMsg,
      10
    );
    const compactContents = normalizeConversationContents(
      history,
      trimmedMsg,
      6
    );

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        messages: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description:
            '1 or 2 natural Vietnamese chat bubbles replying as a close, mature human friend.',
        },
        memoryUpdates: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description:
            '0 to 2 concise factual notes learned from the user message for long-term memory; empty array if nothing notable.',
        },
      },
      required: ['messages', 'memoryUpdates'],
    };

    const { result, tierLabel } = await executeFallbackChain<{
      messages: string[];
      memoryUpdates: string[];
    }>([
      {
        label: 'tier1-flash-lite',
        timeoutMs: 9000,
        run: async () => {
          const res = await ai.models.generateContent({
            model: PRIMARY_MODEL,
            contents: standardContents,
            config: {
              systemInstruction: `${HUMAN_COMPANION_SYSTEM_INSTRUCTION}\n\nBỐI CẢNH HIỆN TẠI:\n${standardContext}`,
              thinkingConfig: {
                thinkingLevel: isComplexTurn
                  ? ThinkingLevel.LOW
                  : ThinkingLevel.MINIMAL,
              },
              responseMimeType: 'application/json',
              responseSchema,
            },
          });
          const parsed = parseStructuredChatResponse(
            safeExtractResponseText(res)
          );
          return parsed.messages.length > 0 ? parsed : null;
        },
      },
      {
        label: 'tier2-flash-lite-compact',
        timeoutMs: 10000,
        delayBeforeMs: 550,
        run: async () => {
          const res = await ai.models.generateContent({
            model: PRIMARY_MODEL,
            contents: compactContents,
            config: {
              systemInstruction: `${COMPACT_COMPANION_SYSTEM_INSTRUCTION}\n\nBỐI CẢNH:\n${compactContext}`,
              thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
            },
          });
          const parsed = parseStructuredChatResponse(
            safeExtractResponseText(res)
          );
          return parsed.messages.length > 0 ? parsed : null;
        },
      },
      {
        label: 'tier3-fallback-hydrogen',
        timeoutMs: 11000,
        delayBeforeMs: 650,
        run: async () => {
          const res = await ai.models.generateContent({
            model: FALLBACK_MODEL,
            contents: compactContents,
            config: {
              systemInstruction: `${COMPACT_COMPANION_SYSTEM_INSTRUCTION}\n\nBỐI CẢNH:\n${compactContext}`,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            },
          });
          const parsed = parseStructuredChatResponse(
            safeExtractResponseText(res)
          );
          return parsed.messages.length > 0 ? parsed : null;
        },
      },
    ]);

    return NextResponse.json({
      text: result.messages.join('\n'),
      messages: result.messages,
      memoryUpdates: result.memoryUpdates,
      source: tierLabel,
    });
  } catch (err) {
    console.error('[Chat API Error]:', err);
    const mapped = mapUserFacingApiError(err);
    return NextResponse.json(
      {
        error: mapped.message,
        code: mapped.code,
        retryable: mapped.retryable,
      },
      { status: mapped.status }
    );
  }
}
