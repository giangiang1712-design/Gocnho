'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  Bell,
  BellOff,
  BookHeart,
  Camera,
  CheckCircle2,
  Feather,
  Heart,
  MessageCircleHeart,
  MessageSquareHeart,
  Minus,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import {
  DataService,
  INITIAL_CHAT_MESSAGES,
  INITIAL_MOOD_DIARY_ENTRIES,
  MOOD_DIARY_EMOTIONS,
  playGentleGameChime,
  playPaperFlipSound,
} from '@/lib/data-service';
import { getEmotionVisual } from '@/lib/mood-visuals';
import type {
  ChatMessage,
  ChatMessageRelatedPhoto,
  CompanionMemoryItem,
  MoodCheckInTrigger,
  MoodDiaryEmotion,
  MoodDiaryEntry,
} from '@/lib/types';

interface PolaroidHighlight {
  id?: string;
  caption: string;
  story?: string;
  date: string;
  emotionTag: string;
  imageUrl?: string;
}

interface WishHighlight {
  title: string;
  note?: string;
  category?: string;
  fulfilled?: boolean;
  thanhReply?: string;
}

interface ChatCompanionProps {
  herNickname: string;
  senderAlias?: string;
  recentMood?: string;
  recentWish?: string;
  polaroidHighlights?: PolaroidHighlight[];
  wishHighlights?: WishHighlight[];
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onUnreadCountChange?: (count: number) => void;
  moodDiaryEntries?: MoodDiaryEntry[];
  onMoodDiaryEntriesChange?: (entries: MoodDiaryEntry[]) => void;
  onSelectMoodContext?: (moodContext: string) => void;
  onNavigateToGallery?: () => void;
  latestMoodEmotion?: MoodDiaryEmotion;
  moodCheckInTrigger?: MoodCheckInTrigger | null;
  onQuickMoodSelect?: (emotion: MoodDiaryEmotion) => void;
}

function getContextualQuickChips(
  localHour: number,
  latestEmotion?: MoodDiaryEmotion
): string[] {
  if (localHour >= 22 || localHour < 5) {
    return [
      'Khuya rồi mà đầu óc vẫn chưa chịu tắt máy...',
      'Hôm nay cuối cùng cũng xong việc rồi nè',
      'Kể mình nghe chuyện gì nhảm nhảm cho dễ ngủ đi',
      'Thấy bản thân dạo này hơi bị tham việc quá',
    ];
  }
  if (localHour >= 5 && localHour < 11) {
    return [
      'Sáng nay dậy mà vẫn còn muốn ngủ nướng tiếp ghê',
      'Đang ngồi nhâm nhi chút gì đó trước khi làm việc',
      'Hôm nay lịch trình nhìn hơi căng rồi đó',
      'Chấm điểm năng lượng sáng nay chắc được 6/10 thôi',
    ];
  }
  if (latestEmotion === 'tired' || latestEmotion === 'busy') {
    return [
      'Hôm nay nhiều việc xoay như chong chóng luôn...',
      'Mệt ngang, chỉ muốn trốn đi đâu đó một buổi',
      'Tối nay ăn gì cho đỡ nhạt nhẽo bây giờ?',
      'Cậu có hay bị tụt mood vô cớ kiểu này không?',
    ];
  }
  return [
    'Hôm nay tự nhiên thấy thời tiết dễ chịu ghê',
    'Kể mình nghe một góc nhìn gì hay hay đi',
    'Đang phân vân tối nay ăn gì cho đỡ nhạt nhẽo',
    'Hôm nay mình vừa trải qua một chuyện hơi buồn cười',
  ];
}

function buildUniqueMessageId(
  prefix: 'user' | 'companion' | 'fallback',
  seq: number
): string {
  const rand = Math.random().toString(36).slice(2, 6);
  return `msg-${prefix}-${Date.now()}-${seq}-${rand}`;
}

type ProactiveTopic = 'polaroid' | 'wellness' | 'wish' | 'daynote';

interface ProactiveMetaState {
  enabled: boolean;
  lastVisitAt: number;
  lastReminderAt: number;
  lastTopic?: ProactiveTopic;
  remindedPhotoIds: string[];
}

const PROACTIVE_META_KEY = 'gnqa_proactive_meta_v1';
const PROACTIVE_COOLDOWN_MS = 8 * 60 * 1000;
const PROACTIVE_RETURN_ABSENCE_MS = 15 * 60 * 1000;
const PROACTIVE_RETURN_DELAY_MS = 45 * 1000;
const PROACTIVE_INITIAL_STAY_MS = 120 * 1000;
const PROACTIVE_REPEAT_INTERVAL_MS = 10 * 60 * 1000;
const MOOD_CHECKIN_AI_COOLDOWN_MS = 20 * 1000;

function readProactiveMeta(): ProactiveMetaState {
  const fallback: ProactiveMetaState = {
    enabled: true,
    lastVisitAt: 0,
    lastReminderAt: 0,
    remindedPhotoIds: [],
  };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(PROACTIVE_META_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<ProactiveMetaState>;
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
      lastVisitAt:
        typeof parsed.lastVisitAt === 'number' ? parsed.lastVisitAt : 0,
      lastReminderAt:
        typeof parsed.lastReminderAt === 'number' ? parsed.lastReminderAt : 0,
      lastTopic: parsed.lastTopic,
      remindedPhotoIds: Array.isArray(parsed.remindedPhotoIds)
        ? parsed.remindedPhotoIds
        : [],
    };
  } catch {
    return fallback;
  }
}

function writeProactiveMeta(meta: ProactiveMetaState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROACTIVE_META_KEY, JSON.stringify(meta));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

function getClientTimeContext() {
  const hour = new Date().getHours();
  let timeOfDayLabel = 'buổi tối';
  if (hour >= 5 && hour < 11) timeOfDayLabel = 'buổi sáng';
  else if (hour >= 11 && hour < 14) timeOfDayLabel = 'buổi trưa';
  else if (hour >= 14 && hour < 18) timeOfDayLabel = 'buổi chiều';
  else if (hour >= 18 && hour < 22) timeOfDayLabel = 'buổi tối';
  else timeOfDayLabel = 'đêm khuya';
  return { localHour: hour, timeOfDayLabel };
}

function pickNextProactiveContext(
  meta: ProactiveMetaState,
  polaroids: PolaroidHighlight[],
  wishes: WishHighlight[]
): {
  topic: ProactiveTopic;
  chosenPhoto?: ChatMessageRelatedPhoto & { story?: string };
  chosenWishTitle?: string;
  chosenWishNote?: string;
  nextRemindedPhotoIds: string[];
} {
  const validPhotos = polaroids.filter(
    (p) => Boolean(p.caption) && Boolean(p.imageUrl)
  );
  const activeWishes = wishes.filter((w) => Boolean(w.title) && !w.fulfilled);
  const candidateWishes =
    activeWishes.length > 0
      ? activeWishes
      : wishes.filter((w) => Boolean(w.title));

  const availableTopics: ProactiveTopic[] = ['wellness', 'daynote'];
  if (validPhotos.length > 0) availableTopics.unshift('polaroid');
  if (candidateWishes.length > 0) availableTopics.push('wish');

  const filteredTopics = availableTopics.filter((t) => t !== meta.lastTopic);
  const pool = filteredTopics.length > 0 ? filteredTopics : availableTopics;
  const topic = pool[Math.floor(Math.random() * pool.length)];

  if (topic === 'polaroid' && validPhotos.length > 0) {
    const unreminded = validPhotos.filter(
      (p) => !meta.remindedPhotoIds.includes(p.id || p.caption)
    );
    const photoPool = unreminded.length > 0 ? unreminded : validPhotos;
    const picked = photoPool[Math.floor(Math.random() * photoPool.length)];
    const photoKey = picked.id || picked.caption;
    const nextRemindedPhotoIds =
      unreminded.length > 0
        ? [...meta.remindedPhotoIds, photoKey]
        : [photoKey];

    return {
      topic,
      chosenPhoto: {
        id: picked.id || photoKey,
        caption: picked.caption,
        story: picked.story,
        date: picked.date,
        imageUrl: picked.imageUrl || '',
        emotionTag: picked.emotionTag,
      },
      nextRemindedPhotoIds,
    };
  }

  if (topic === 'wish' && candidateWishes.length > 0) {
    const pickedWish =
      candidateWishes[Math.floor(Math.random() * candidateWishes.length)];
    return {
      topic,
      chosenWishTitle: pickedWish.title,
      chosenWishNote: pickedWish.note,
      nextRemindedPhotoIds: meta.remindedPhotoIds,
    };
  }

  return {
    topic,
    nextRemindedPhotoIds: meta.remindedPhotoIds,
  };
}

function getProactiveTopicLabel(topic?: ProactiveTopic): string {
  switch (topic) {
    case 'polaroid':
      return 'Kỷ niệm Polaroid';
    case 'wish':
      return 'Hũ Điều Ước';
    case 'wellness':
      return 'Chăm sóc nhỏ';
    case 'daynote':
    default:
      return 'Lời nhắn nhẹ';
  }
}

export default function ChatCompanion({
  herNickname,
  senderAlias = 'X',
  recentMood,
  recentWish,
  polaroidHighlights = [],
  wishHighlights = [],
  isOpen: controlledIsOpen,
  onOpenChange,
  onUnreadCountChange,
  moodDiaryEntries: controlledDiaryEntries,
  onMoodDiaryEntriesChange,
  onSelectMoodContext,
  onNavigateToGallery,
  latestMoodEmotion,
  moodCheckInTrigger,
  onQuickMoodSelect,
}: ChatCompanionProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (val: boolean) => {
    if (onOpenChange) onOpenChange(val);
    setInternalIsOpen(val);
    if (val) {
      setUnreadCount(0);
      setActiveBubbleReminder(null);
      setShowTooltip(false);
    }
  };

  // Active Station Tab: 'chat' | 'diary'
  const [activeStationTab, setActiveStationTab] = useState<'chat' | 'diary'>(
    'chat'
  );

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [companionMemories, setCompanionMemories] = useState<
    CompanionMemoryItem[]
  >([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFollowUpTyping, setIsFollowUpTyping] = useState(false);
  const [isMoodStarterLoading, setIsMoodStarterLoading] = useState(false);
  const [chatError, setChatError] = useState<{
    message: string;
    failedText: string;
    retryable: boolean;
  } | null>(null);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string>('');
  const [showTooltip, setShowTooltip] = useState(true);
  const [proactiveEnabled, setProactiveEnabled] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeBubbleReminder, setActiveBubbleReminder] =
    useState<ChatMessage | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const msgCounterRef = useRef<number>(100);
  const streamIntervalRef = useRef<number | null>(null);
  const followUpTimerRef = useRef<number | null>(null);
  const proactiveTimerRef = useRef<number | null>(null);
  const lastHandledMoodTriggerIdRef = useRef<number>(0);
  const lastMoodAiSentAtRef = useRef<number>(0);
  const lastUserChatAtRef = useRef<number>(0);
  const moodAbortRef = useRef<AbortController | null>(null);
  const isFollowUpTypingRef = useRef<boolean>(isFollowUpTyping);
  const isMoodStarterLoadingRef = useRef<boolean>(isMoodStarterLoading);
  const onUnreadCountChangeRef = useRef(onUnreadCountChange);

  useEffect(() => {
    onUnreadCountChangeRef.current = onUnreadCountChange;
  }, [onUnreadCountChange]);

  useEffect(() => {
    onUnreadCountChangeRef.current?.(unreadCount);
  }, [unreadCount]);

  // Mood Diary state
  const [internalDiaryEntries, setInternalDiaryEntries] = useState<
    MoodDiaryEntry[]
  >(INITIAL_MOOD_DIARY_ENTRIES);
  const diaryEntries =
    controlledDiaryEntries !== undefined
      ? controlledDiaryEntries
      : internalDiaryEntries;

  // Latest state refs for async proactive scheduler without resetting timers
  const messagesRef = useRef<ChatMessage[]>(messages);
  const companionMemoriesRef =
    useRef<CompanionMemoryItem[]>(companionMemories);
  const isOpenRef = useRef<boolean>(isOpen);
  const isLoadingRef = useRef<boolean>(isLoading);
  const proactiveEnabledRef = useRef<boolean>(proactiveEnabled);
  const polaroidHighlightsRef = useRef<PolaroidHighlight[]>(polaroidHighlights);
  const wishHighlightsRef = useRef<WishHighlight[]>(wishHighlights);
  const diaryEntriesRef = useRef<MoodDiaryEntry[]>(diaryEntries);
  const herNicknameRef = useRef<string>(herNickname);
  const senderAliasRef = useRef<string>(senderAlias);
  const recentMoodRef = useRef<string | undefined>(recentMood);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    companionMemoriesRef.current = companionMemories;
  }, [companionMemories]);

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) {
      Promise.resolve().then(() => {
        setUnreadCount(0);
        setActiveBubbleReminder(null);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    isFollowUpTypingRef.current = isFollowUpTyping;
  }, [isFollowUpTyping]);

  useEffect(() => {
    isMoodStarterLoadingRef.current = isMoodStarterLoading;
  }, [isMoodStarterLoading]);

  useEffect(() => {
    proactiveEnabledRef.current = proactiveEnabled;
  }, [proactiveEnabled]);

  useEffect(() => {
    polaroidHighlightsRef.current = polaroidHighlights;
  }, [polaroidHighlights]);

  useEffect(() => {
    wishHighlightsRef.current = wishHighlights;
  }, [wishHighlights]);

  useEffect(() => {
    diaryEntriesRef.current = diaryEntries;
  }, [diaryEntries]);

  useEffect(() => {
    herNicknameRef.current = herNickname;
    senderAliasRef.current = senderAlias;
    recentMoodRef.current = recentMood;
  }, [herNickname, senderAlias, recentMood]);

  const updateDiaryEntries = (next: MoodDiaryEntry[]) => {
    if (onMoodDiaryEntriesChange) {
      onMoodDiaryEntriesChange(next);
    }
    setInternalDiaryEntries(next);
  };

  const [selectedEmotion, setSelectedEmotion] =
    useState<MoodDiaryEmotion>('radiant');
  const [diaryNoteInput, setDiaryNoteInput] = useState('');
  const [diarySavedToast, setDiarySavedToast] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      const savedChat = DataService.getChatHistory();
      if (savedChat && savedChat.length > 0) {
        setMessages(savedChat);
      }
      const savedMemories = DataService.getCompanionMemories();
      if (savedMemories && savedMemories.length > 0) {
        setCompanionMemories(savedMemories);
      }
      const savedDiary = DataService.getMoodDiaryEntries();
      if (savedDiary && savedDiary.length > 0) {
        setInternalDiaryEntries(savedDiary);
      }
      const meta = readProactiveMeta();
      setProactiveEnabled(meta.enabled);
    });
    return () => {
      active = false;
      if (streamIntervalRef.current) {
        window.clearInterval(streamIntervalRef.current);
      }
      if (followUpTimerRef.current) {
        window.clearTimeout(followUpTimerRef.current);
      }
    };
  }, []);

  // Gentle periodic proactive reminder scheduler
  useEffect(() => {
    let active = true;

    const triggerProactiveReminder = async () => {
      if (!active) return;
      const currentMeta = readProactiveMeta();
      const now = Date.now();

      if (
        !proactiveEnabledRef.current ||
        !currentMeta.enabled ||
        document.hidden ||
        isOpenRef.current ||
        isLoadingRef.current ||
        isFollowUpTypingRef.current ||
        isMoodStarterLoadingRef.current ||
        now - lastUserChatAtRef.current < 2 * 60 * 1000 ||
        now - currentMeta.lastReminderAt < PROACTIVE_COOLDOWN_MS
      ) {
        return;
      }

      const {
        topic,
        chosenPhoto,
        chosenWishTitle,
        chosenWishNote,
        nextRemindedPhotoIds,
      } = pickNextProactiveContext(
        currentMeta,
        polaroidHighlightsRef.current,
        wishHighlightsRef.current
      );

      const latestDiaryEntry = diaryEntriesRef.current[0];
      const recentMoodDiary = latestDiaryEntry
        ? `${latestDiaryEntry.emotionLabel} — "${latestDiaryEntry.shortNote}"`
        : recentMoodRef.current || '';
      const { localHour, timeOfDayLabel } = getClientTimeContext();

      let reminderText = '';
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 16000);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            mode: 'proactive_reminder',
            proactivePayload: {
              topic,
              photo: chosenPhoto
                ? {
                    id: chosenPhoto.id,
                    caption: chosenPhoto.caption,
                    story: chosenPhoto.story,
                    date: chosenPhoto.date,
                    emotionTag: chosenPhoto.emotionTag,
                  }
                : undefined,
              wishTitle: chosenWishTitle,
              wishNote: chosenWishNote,
            },
            history: messagesRef.current.slice(-6),
            herNickname: herNicknameRef.current,
            senderAlias: senderAliasRef.current,
            recentMoodDiary,
            localHour,
            timeOfDayLabel,
            companionMemories: companionMemoriesRef.current.slice(0, 6).map((m) => ({
              fact: m.fact,
              updatedAt: m.updatedAt,
            })),
            scrapbookContext: {
              polaroidHighlights: polaroidHighlightsRef.current
                .slice(0, 3)
                .map((p) => ({
                  caption: p.caption,
                  story: p.story,
                  date: p.date,
                  emotionTag: p.emotionTag,
                })),
              wishHighlights: wishHighlightsRef.current
                .slice(0, 3)
                .map((w) => ({
                  title: w.title,
                  note: w.note,
                  category: w.category,
                  fulfilled: w.fulfilled,
                })),
              moodDiaryHistory: diaryEntriesRef.current.slice(0, 3).map((d) => ({
                emotionLabel: d.emotionLabel,
                shortNote: d.shortNote,
                createdAt: d.createdAt,
                customAdminReply: d.customAdminReply,
              })),
            },
          }),
        });
        window.clearTimeout(timeoutId);
        const data = await res.json();
        if (
          res.ok &&
          data &&
          !data.skipped &&
          typeof data.text === 'string' &&
          data.text.trim()
        ) {
          reminderText = data.text.trim();
        }
      } catch {
        window.clearTimeout(timeoutId);
      }

      if (
        !active ||
        isOpenRef.current ||
        !proactiveEnabledRef.current ||
        !reminderText
      ) {
        return;
      }

      const photoForCard: ChatMessageRelatedPhoto | undefined = chosenPhoto
        ? {
            id: chosenPhoto.id,
            caption: chosenPhoto.caption,
            date: chosenPhoto.date,
            imageUrl: chosenPhoto.imageUrl,
            emotionTag: chosenPhoto.emotionTag,
          }
        : undefined;

      msgCounterRef.current += 1;
      const reminderMsg: ChatMessage = {
        id: buildUniqueMessageId('companion', msgCounterRef.current),
        sender: 'thanh',
        text: reminderText,
        timestamp: new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        isProactiveReminder: true,
        reminderTopic: topic,
        relatedPhoto: photoForCard,
      };

      const nextHistory = [...messagesRef.current, reminderMsg];
      setMessages(nextHistory);
      DataService.saveChatHistory(nextHistory);
      setActiveBubbleReminder(reminderMsg);
      setShowTooltip(false);
      setUnreadCount((prev) => prev + 1);

      writeProactiveMeta({
        ...currentMeta,
        lastVisitAt: Date.now(),
        lastReminderAt: Date.now(),
        lastTopic: topic,
        remindedPhotoIds: nextRemindedPhotoIds,
      });
    };

    const scheduleNext = (delayMs: number) => {
      if (!active) return;
      if (proactiveTimerRef.current) {
        window.clearTimeout(proactiveTimerRef.current);
      }
      proactiveTimerRef.current = window.setTimeout(async () => {
        await triggerProactiveReminder();
        scheduleNext(PROACTIVE_REPEAT_INTERVAL_MS);
      }, delayMs);
    };

    const initialMeta = readProactiveMeta();
    const now = Date.now();
    const elapsedSinceLastVisit =
      initialMeta.lastVisitAt > 0 ? now - initialMeta.lastVisitAt : 0;
    const isReturningUser =
      elapsedSinceLastVisit >= PROACTIVE_RETURN_ABSENCE_MS;

    writeProactiveMeta({
      ...initialMeta,
      lastVisitAt: now,
    });

    if (initialMeta.enabled) {
      const initialDelay =
        isReturningUser &&
        now - initialMeta.lastReminderAt >= PROACTIVE_COOLDOWN_MS
          ? PROACTIVE_RETURN_DELAY_MS
          : PROACTIVE_INITIAL_STAY_MS;
      scheduleNext(initialDelay);
    }

    const stampLastVisit = () => {
      const latest = readProactiveMeta();
      writeProactiveMeta({
        ...latest,
        lastVisitAt: Date.now(),
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stampLastVisit();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', stampLastVisit);

    return () => {
      active = false;
      if (proactiveTimerRef.current) {
        window.clearTimeout(proactiveTimerRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', stampLastVisit);
    };
  }, []);

  useEffect(() => {
    if (isOpen && activeStationTab === 'chat' && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  }, [
    messages,
    isLoading,
    isFollowUpTyping,
    chatError,
    isOpen,
    streamingText,
    activeStationTab,
  ]);

  const animateTypewriterReply = (
    msgId: string,
    fullText: string,
    onDone?: () => void
  ) => {
    if (streamIntervalRef.current) {
      window.clearInterval(streamIntervalRef.current);
    }
    setStreamingMsgId(msgId);
    setStreamingText('');
    let idx = 0;
    const step = Math.max(3, Math.ceil(fullText.length / 32));
    streamIntervalRef.current = window.setInterval(() => {
      idx += step;
      if (idx >= fullText.length) {
        setStreamingText(fullText);
        setStreamingMsgId(null);
        if (streamIntervalRef.current) {
          window.clearInterval(streamIntervalRef.current);
          streamIntervalRef.current = null;
        }
        if (onDone) onDone();
      } else {
        setStreamingText(fullText.slice(0, idx));
      }
    }, 16);
  };

  // React softly with a human conversation starter whenever a quick mood icon is tapped
  useEffect(() => {
    if (!moodCheckInTrigger || moodCheckInTrigger.id === lastHandledMoodTriggerIdRef.current) {
      return;
    }
    lastHandledMoodTriggerIdRef.current = moodCheckInTrigger.id;
    setSelectedEmotion(moodCheckInTrigger.emotion);

    if (moodAbortRef.current) {
      moodAbortRef.current.abort();
    }
    const controller = new AbortController();
    moodAbortRef.current = controller;

    let cancelled = false;
    const debounceTimer = window.setTimeout(async () => {
      const now = Date.now();
      if (
        cancelled ||
        isLoadingRef.current ||
        isFollowUpTypingRef.current ||
        now - lastMoodAiSentAtRef.current < MOOD_CHECKIN_AI_COOLDOWN_MS
      ) {
        return;
      }
      lastMoodAiSentAtRef.current = now;
      setIsMoodStarterLoading(true);
      const { localHour, timeOfDayLabel } = getClientTimeContext();
      const moodTimeoutId = window.setTimeout(() => controller.abort(), 16000);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            mode: 'mood_checkin',
            moodCheckIn: {
              emotion: moodCheckInTrigger.emotion,
              emotionLabel: moodCheckInTrigger.emotionLabel,
              createdAt: moodCheckInTrigger.createdAt,
            },
            history: messagesRef.current.slice(-6),
            herNickname: herNicknameRef.current,
            senderAlias: senderAliasRef.current,
            recentMood: moodCheckInTrigger.emotionLabel,
            localHour,
            timeOfDayLabel,
            companionMemories: companionMemoriesRef.current.slice(0, 6).map((m) => ({
              fact: m.fact,
              updatedAt: m.updatedAt,
            })),
            scrapbookContext: {
              polaroidHighlights: polaroidHighlightsRef.current
                .slice(0, 3)
                .map((p) => ({
                  caption: p.caption,
                  story: p.story,
                  date: p.date,
                  emotionTag: p.emotionTag,
                })),
              wishHighlights: wishHighlightsRef.current
                .slice(0, 3)
                .map((w) => ({
                  title: w.title,
                  note: w.note,
                  category: w.category,
                  fulfilled: w.fulfilled,
                })),
              moodDiaryHistory: diaryEntriesRef.current.slice(0, 3).map((d) => ({
                emotionLabel: d.emotionLabel,
                shortNote: d.shortNote,
                createdAt: d.createdAt,
                customAdminReply: d.customAdminReply,
              })),
            },
          }),
        });
        window.clearTimeout(moodTimeoutId);

        const data = await res.json();
        if (cancelled || controller.signal.aborted) return;

        if (
          res.ok &&
          data &&
          !data.skipped &&
          Array.isArray(data.messages) &&
          data.messages.length > 0
        ) {
          const bubbles = data.messages
            .filter((m: unknown): m is string => typeof m === 'string' && m.trim().length > 0)
            .map((m: string) => m.trim())
            .slice(0, 2);

          if (Array.isArray(data.memoryUpdates) && data.memoryUpdates.length > 0) {
            const merged = DataService.mergeCompanionMemoryFacts(data.memoryUpdates);
            setCompanionMemories(merged);
          }

          if (bubbles.length > 0) {
            const nowLabel = new Date().toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            });

            msgCounterRef.current += 1;
            const firstId = buildUniqueMessageId('companion', msgCounterRef.current);
            const firstMsg: ChatMessage = {
              id: firstId,
              sender: 'thanh',
              text: bubbles[0],
              timestamp: nowLabel,
              moodContext: moodCheckInTrigger.emotionLabel,
              isProactiveReminder: true,
              reminderTopic: 'daynote',
            };

            const nextMsgs = [...messagesRef.current, firstMsg];
            setMessages(nextMsgs);
            DataService.saveChatHistory(nextMsgs);

            if (!isOpenRef.current) {
              if (bubbles[1]) {
                msgCounterRef.current += 1;
                const secondMsg: ChatMessage = {
                  id: buildUniqueMessageId('companion', msgCounterRef.current),
                  sender: 'thanh',
                  text: bubbles[1],
                  timestamp: nowLabel,
                  moodContext: moodCheckInTrigger.emotionLabel,
                };
                const withSecond = [...nextMsgs, secondMsg];
                setMessages(withSecond);
                DataService.saveChatHistory(withSecond);
                setActiveBubbleReminder({
                  ...firstMsg,
                  text: `${bubbles[0]}\n${bubbles[1]}`,
                });
              } else {
                setActiveBubbleReminder(firstMsg);
              }
              setShowTooltip(false);
              setUnreadCount((prev) => prev + 1);
            } else {
              animateTypewriterReply(firstId, bubbles[0], () => {
                if (!bubbles[1]) return;
                setIsFollowUpTyping(true);
                if (followUpTimerRef.current) {
                  window.clearTimeout(followUpTimerRef.current);
                }
                followUpTimerRef.current = window.setTimeout(() => {
                  setIsFollowUpTyping(false);
                  msgCounterRef.current += 1;
                  const secondId = buildUniqueMessageId(
                    'companion',
                    msgCounterRef.current
                  );
                  const secondMsg: ChatMessage = {
                    id: secondId,
                    sender: 'thanh',
                    text: bubbles[1],
                    timestamp: new Date().toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                    moodContext: moodCheckInTrigger.emotionLabel,
                  };
                  const withSecond = [...messagesRef.current, secondMsg];
                  setMessages(withSecond);
                  DataService.saveChatHistory(withSecond);
                  animateTypewriterReply(secondId, bubbles[1]);
                }, 480);
              });
            }
          }
        }
      } catch {
        // Silent graceful fallback if aborted or offline
      } finally {
        window.clearTimeout(moodTimeoutId);
        if (!cancelled) {
          setIsMoodStarterLoading(false);
        }
      }
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(debounceTimer);
      controller.abort();
    };
  }, [moodCheckInTrigger]);

  const handleChatQuickMoodTap = (emotion: MoodDiaryEmotion) => {
    setSelectedEmotion(emotion);
    if (onQuickMoodSelect) {
      onQuickMoodSelect(emotion);
      return;
    }
    playGentleGameChime(659.25);
    const created = DataService.addMoodDiaryEntry(emotion, '');
    updateDiaryEntries([created, ...diaryEntries]);
    if (onSelectMoodContext) {
      onSelectMoodContext(created.emotionLabel);
    }
  };

  const getLocalTimeContext = () => getClientTimeContext();

  const handleToggleProactive = () => {
    const nextEnabled = !proactiveEnabled;
    setProactiveEnabled(nextEnabled);
    const meta = readProactiveMeta();
    writeProactiveMeta({
      ...meta,
      enabled: nextEnabled,
    });
    if (!nextEnabled) {
      setActiveBubbleReminder(null);
    }
  };

  const sendMessage = async (
    textToSend: string,
    options?: { reuseExistingUserMessage?: boolean }
  ) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading || isFollowUpTyping) return;

    const reuseExisting = Boolean(options?.reuseExistingUserMessage);
    const now = new Date();
    const timeLabel = now.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    let priorHistory = messages;
    let nextHistory = messages;

    if (reuseExisting) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.sender === 'her' && lastMsg.text.trim() === trimmed) {
        priorHistory = messages.slice(0, -1);
      }
    } else {
      msgCounterRef.current += 1;
      const userMsg: ChatMessage = {
        id: buildUniqueMessageId('user', msgCounterRef.current),
        sender: 'her',
        text: trimmed,
        timestamp: timeLabel,
      };
      nextHistory = [...priorHistory, userMsg];
      setMessages(nextHistory);
      DataService.saveChatHistory(nextHistory);
      setInput('');
    }

    if (moodAbortRef.current) {
      moodAbortRef.current.abort();
      setIsMoodStarterLoading(false);
    }
    lastUserChatAtRef.current = Date.now();
    setChatError(null);
    setIsLoading(true);

    const latestDiaryEntry = diaryEntries[0];
    const latestDiaryMood = latestDiaryEntry?.emotionLabel || recentMood || '';
    const recentMoodDiary = latestDiaryEntry
      ? `${latestDiaryEntry.emotionLabel} — "${latestDiaryEntry.shortNote}"`
      : '';
    const { localHour, timeOfDayLabel } = getLocalTimeContext();

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 38000);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: trimmed,
          history: priorHistory.slice(-10),
          herNickname,
          senderAlias,
          recentMood: latestDiaryMood,
          recentMoodDiary,
          recentWish,
          localHour,
          timeOfDayLabel,
          companionMemories: companionMemories.slice(0, 8).map((m) => ({
            fact: m.fact,
            updatedAt: m.updatedAt,
          })),
          scrapbookContext: {
            polaroidHighlights: polaroidHighlights.slice(0, 3).map((p) => ({
              caption: p.caption,
              story: p.story,
              date: p.date,
              emotionTag: p.emotionTag,
            })),
            wishHighlights: wishHighlights.slice(0, 3).map((w) => ({
              title: w.title,
              note: w.note,
              category: w.category,
              fulfilled: w.fulfilled,
              thanhReply: w.thanhReply,
            })),
            moodDiaryHistory: diaryEntries.slice(0, 4).map((d) => ({
              emotionLabel: d.emotionLabel,
              shortNote: d.shortNote,
              createdAt: d.createdAt,
              customAdminReply: d.customAdminReply,
            })),
          },
        }),
      });
      window.clearTimeout(timeoutId);

      const data = await response.json();
      if (!response.ok || data?.error) {
        setChatError({
          message:
            typeof data?.error === 'string' && data.error.trim()
              ? data.error
              : 'Kết nối tới AI vừa bị gián đoạn một chút, cậu nhấn thử lại nhé.',
          failedText: trimmed,
          retryable: data?.retryable !== false,
        });
        return;
      }

      const incomingBubbles: string[] = Array.isArray(data?.messages)
        ? data.messages
            .filter(
              (m: unknown): m is string =>
                typeof m === 'string' && m.trim().length > 0
            )
            .map((m: string) => m.trim())
            .slice(0, 2)
        : typeof data?.text === 'string' && data.text.trim()
          ? [data.text.trim()]
          : [];

      if (incomingBubbles.length === 0) {
        setChatError({
          message: 'Tin nhắn phản hồi vừa bị trống, cậu thử gửi lại nhé.',
          failedText: trimmed,
          retryable: true,
        });
        return;
      }

      if (Array.isArray(data?.memoryUpdates) && data.memoryUpdates.length > 0) {
        const mergedMemories = DataService.mergeCompanionMemoryFacts(
          data.memoryUpdates
        );
        setCompanionMemories(mergedMemories);
      }

      msgCounterRef.current += 1;
      const firstId = buildUniqueMessageId('companion', msgCounterRef.current);
      const firstMsg: ChatMessage = {
        id: firstId,
        sender: 'thanh',
        text: incomingBubbles[0],
        timestamp: new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      const afterFirstHistory = [...nextHistory, firstMsg];
      setMessages(afterFirstHistory);
      DataService.saveChatHistory(afterFirstHistory);

      const secondText = incomingBubbles[1];
      animateTypewriterReply(firstId, incomingBubbles[0], () => {
        if (!secondText) return;
        setIsFollowUpTyping(true);
        if (followUpTimerRef.current) {
          window.clearTimeout(followUpTimerRef.current);
        }
        followUpTimerRef.current = window.setTimeout(() => {
          setIsFollowUpTyping(false);
          msgCounterRef.current += 1;
          const secondId = buildUniqueMessageId(
            'companion',
            msgCounterRef.current
          );
          const secondMsg: ChatMessage = {
            id: secondId,
            sender: 'thanh',
            text: secondText,
            timestamp: new Date().toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          };
          const afterSecondHistory = [...afterFirstHistory, secondMsg];
          setMessages(afterSecondHistory);
          DataService.saveChatHistory(afterSecondHistory);
          animateTypewriterReply(secondId, secondText);
        }, 550);
      });
    } catch {
      window.clearTimeout(timeoutId);
      setChatError({
        message:
          'Đường truyền vừa chập chờn nên tin nhắn chưa đi tới nơi, cậu bấm thử gửi lại nhé.',
        failedText: trimmed,
        retryable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    if (streamIntervalRef.current) {
      window.clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    if (followUpTimerRef.current) {
      window.clearTimeout(followUpTimerRef.current);
      followUpTimerRef.current = null;
    }
    setIsFollowUpTyping(false);
    setChatError(null);
    setStreamingMsgId(null);
    const reset = DataService.clearChatHistory();
    setMessages(reset);
  };

  const handleAddDiaryEntry = (e: React.FormEvent) => {
    e.preventDefault();
    playGentleGameChime(659.25);
    const created = DataService.addMoodDiaryEntry(
      selectedEmotion,
      diaryNoteInput
    );
    const updatedList = [created, ...diaryEntries];
    updateDiaryEntries(updatedList);
    if (onSelectMoodContext) {
      onSelectMoodContext(`${created.emotionLabel}: ${created.shortNote}`);
    }
    setDiaryNoteInput('');
    setDiarySavedToast(true);
    window.setTimeout(() => setDiarySavedToast(false), 3200);
  };

  const customRepliesCount = diaryEntries.filter((e) =>
    Boolean(e.customAdminReply && e.customAdminReply.trim())
  ).length;

  return (
    <div className="fixed left-3 right-3 sm:left-auto sm:right-5 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-5 z-50 flex flex-col items-end pointer-events-none">
      {/* Expanded Floating Listening Station Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="pointer-events-auto mb-2 md:mb-3 w-full sm:w-[410px] h-[min(560px,calc(100dvh-6.25rem-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] md:h-[min(560px,calc(100dvh-6.5rem))] bg-white/95 dark:bg-[#261C20]/92 backdrop-blur-xl rounded-3xl border border-[#F7D6E0] dark:border-[#4F3941] shadow-[0_20px_60px_rgba(255,143,163,0.35)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 sm:px-5 py-3 bg-gradient-to-r from-[#FFF0F3]/95 via-[#FFE5EC]/95 to-[#FFF0F3]/95 dark:from-[#322329]/95 dark:via-[#2B1E23]/95 dark:to-[#322329]/95 border-b border-[#F7D6E0] dark:border-[#4A363D] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <motion.div
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative w-9 h-9 rounded-full bg-white dark:bg-[#23191D] border border-[#FFCCD5] dark:border-[#5D414B] flex items-center justify-center shadow-xs shrink-0"
                >
                  <Heart className="w-4 h-4 text-[#FF8FA3] fill-[#FF8FA3]" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#10B981] border-2 border-white dark:border-[#23191D]" />
                </motion.div>
                <div className="min-w-0">
                  <h3
                    className="text-sm font-semibold text-[#4A3B3E] dark:text-[#F6EAEF] leading-tight truncate"
                    style={{ fontFamily: 'var(--font-playfair), serif' }}
                  >
                    Trạm Lắng Nghe Cùng {senderAlias}
                  </h3>
                  <p className="text-[10px] text-[#7D6B6D] dark:text-[#C7B0B7] truncate">
                    Trò chuyện ấm áp · Nhật ký cảm xúc mỗi ngày
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleProactive}
                  title={
                    proactiveEnabled
                      ? `Lời nhắc dịu nhẹ từ ${senderAlias}: Đang bật (nhấn để tạm tắt)`
                      : `Lời nhắc dịu nhẹ từ ${senderAlias}: Đang tắt (nhấn để bật lại)`
                  }
                  aria-label="Bật hoặc tắt lời nhắc dịu nhẹ"
                  className={`min-w-[38px] min-h-[38px] md:min-w-0 md:min-h-0 p-1.5 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer ${
                    proactiveEnabled
                      ? 'text-[#D95B72] dark:text-[#FF9EB0] hover:bg-white/80 dark:hover:bg-[#3A2930]/80'
                      : 'text-[#B39EA1] dark:text-[#9A8189] hover:text-[#4A3B3E] dark:hover:text-[#F6EAEF] hover:bg-white/80 dark:hover:bg-[#3A2930]/80'
                  }`}
                >
                  {proactiveEnabled ? (
                    <Bell className="w-4 h-4 md:w-3.5 md:h-3.5" />
                  ) : (
                    <BellOff className="w-4 h-4 md:w-3.5 md:h-3.5" />
                  )}
                </button>
                {activeStationTab === 'chat' && (
                  <button
                    type="button"
                    onClick={handleResetChat}
                    title="Làm mới cuộc trò chuyện"
                    aria-label="Làm mới cuộc trò chuyện"
                    className="min-w-[38px] min-h-[38px] md:min-w-0 md:min-h-0 p-1.5 rounded-lg inline-flex items-center justify-center text-[#7D6B6D] dark:text-[#C7B0B7] hover:text-[#4A3B3E] dark:hover:text-[#F6EAEF] hover:bg-white/80 dark:hover:bg-[#3A2930]/80 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 md:w-3.5 md:h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Thu gọn Trạm Lắng Nghe"
                  aria-label="Thu gọn Trạm Lắng Nghe"
                  className="min-w-[38px] min-h-[38px] md:min-w-0 md:min-h-0 p-1.5 rounded-lg inline-flex items-center justify-center text-[#7D6B6D] dark:text-[#C7B0B7] hover:text-[#4A3B3E] dark:hover:text-[#F6EAEF] hover:bg-white/80 dark:hover:bg-[#3A2930]/80 transition-colors cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Segmented Tab Switcher: Trò Chuyện | Nhật Ký Cảm Xúc */}
            <div className="px-3.5 py-2 bg-[#FFFDF9]/90 dark:bg-[#22191D]/90 border-b border-[#F7E4EA] dark:border-[#4A363D] flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  playPaperFlipSound();
                  setActiveStationTab('chat');
                }}
                className={`flex-1 min-h-[40px] md:min-h-0 py-1.5 px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  activeStationTab === 'chat'
                    ? 'bg-[#FF8FA3] dark:bg-[#E06D82] text-white shadow-2xs'
                    : 'bg-[#FFF0F3]/60 dark:bg-[#312429]/80 text-[#7D6B6D] dark:text-[#C7B0B7] hover:text-[#4A3B3E] dark:hover:text-[#F6EAEF]'
                }`}
              >
                <MessageCircleHeart className="w-3.5 h-3.5" />
                <span>Trò Chuyện</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playPaperFlipSound();
                  setActiveStationTab('diary');
                }}
                className={`flex-1 min-h-[40px] md:min-h-0 py-1.5 px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  activeStationTab === 'diary'
                    ? 'bg-[#FF8FA3] dark:bg-[#E06D82] text-white shadow-2xs'
                    : 'bg-[#FFF0F3]/60 dark:bg-[#312429]/80 text-[#7D6B6D] dark:text-[#C7B0B7] hover:text-[#4A3B3E] dark:hover:text-[#F6EAEF]'
                }`}
              >
                <BookHeart className="w-3.5 h-3.5" />
                <span>Nhật Ký Cảm Xúc ({diaryEntries.length})</span>
                {customRepliesCount > 0 && activeStationTab !== 'diary' && (
                  <span className="w-2 h-2 rounded-full bg-[#D95B72] dark:bg-[#FF9EB0]" />
                )}
              </button>
            </div>

            {/* TAB 1: Instant Chat Thread */}
            {activeStationTab === 'chat' && (
              <>
                {/* Synced In-Chat Quick Mood Strip */}
                <div className="px-3.5 py-2 bg-[#FFFDF9] dark:bg-[#23191D] border-b border-[#F7E4EA] dark:border-[#4A363D] flex items-center justify-between gap-2 shrink-0">
                  <span className="text-[11px] font-medium text-[#7D6B6D] dark:text-[#C7B0B7] whitespace-nowrap">
                    Cảm xúc:
                  </span>
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    {MOOD_DIARY_EMOTIONS.map((item) => {
                      const activeKey =
                        latestMoodEmotion || diaryEntries[0]?.emotion;
                      const isActive = activeKey === item.key;
                      const { Icon, colorClass, bgClass, activeClass } =
                        getEmotionVisual(item.key);
                      return (
                        <button
                          key={`chat-mood-${item.key}`}
                          type="button"
                          onClick={() => handleChatQuickMoodTap(item.key)}
                          title={`${item.label} — ${item.subtitle}`}
                          className={`px-2 py-1 rounded-lg border text-[10px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                            isActive
                              ? activeClass
                              : `${bgClass} opacity-80 hover:opacity-100 text-[#4A3B3E] dark:text-[#F6EAEF]`
                          }`}
                        >
                          <Icon className={`w-3 h-3 ${colorClass}`} />
                          <span>{item.shortLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div
                  ref={scrollContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#FFFDF9]/85 dark:bg-[#1E161A]/85 text-xs"
                >
                  {messages.map((msg) => {
                    const isHer = msg.sender === 'her';
                    const isCurrentlyStreaming = msg.id === streamingMsgId;
                    const displayText = isCurrentlyStreaming
                      ? streamingText
                      : msg.text;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isHer ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-[#7D6B6D] dark:text-[#C7B0B7]">
                          <span className="font-medium text-[#4A3B3E] dark:text-[#F6EAEF]">
                            {isHer ? herNickname : senderAlias}
                          </span>
                          <span>·</span>
                          <span className="tabular-nums">{msg.timestamp}</span>
                        </div>

                        <div
                          className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl leading-relaxed text-xs ${
                            isHer
                              ? 'bg-[#FF8FA3] dark:bg-[#E06D82] text-white rounded-br-xs shadow-xs'
                              : 'bg-white dark:bg-[#2E2227] text-[#4A3B3E] dark:text-[#F6EAEF] border border-[#F3D1DC] dark:border-[#533D45] rounded-bl-xs shadow-xs'
                          }`}
                        >
                          {!isHer && (msg.isProactiveReminder || msg.moodContext) && (
                            <div className="mb-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FFF0F3] dark:bg-[#3F2B33] border border-[#FFCCD5] dark:border-[#6A4A56] text-[10px] font-semibold text-[#D95B72] dark:text-[#FF9EB0]">
                              {msg.reminderTopic === 'polaroid' ? (
                                <Camera className="w-2.5 h-2.5" />
                              ) : (
                                <Sparkles className="w-2.5 h-2.5" />
                              )}
                              <span>
                                {msg.moodContext
                                  ? `Theo nhịp cảm xúc · ${msg.moodContext}`
                                  : `Nhắc nhẹ · ${getProactiveTopicLabel(msg.reminderTopic)}`}
                              </span>
                            </div>
                          )}

                          <p className="whitespace-pre-line">{displayText}</p>

                          {!isHer && msg.relatedPhoto && msg.relatedPhoto.imageUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                if (onNavigateToGallery) {
                                  onNavigateToGallery();
                                }
                                setIsOpen(false);
                              }}
                              className="mt-2.5 w-full p-2 rounded-xl bg-[#FFFDF9]/90 dark:bg-[#23191D]/90 hover:bg-[#FFF0F3] dark:hover:bg-[#3A2930] border border-[#F3D1DC] dark:border-[#533D45] flex items-center gap-2.5 text-left transition-colors cursor-pointer group"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={msg.relatedPhoto.imageUrl}
                                alt={msg.relatedPhoto.caption}
                                referrerPolicy="no-referrer"
                                className="w-11 h-11 rounded-lg object-cover border border-[#F7D6E0] dark:border-[#5D414B] shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-[10px] text-[#D95B72] dark:text-[#FF9EB0] font-semibold tabular-nums">
                                  Polaroid · {msg.relatedPhoto.date}
                                </div>
                                <div className="text-[11px] font-medium text-[#4A3B3E] dark:text-[#F6EAEF] truncate">
                                  {msg.relatedPhoto.caption}
                                </div>
                                <div className="text-[10px] text-[#7D6B6D] dark:text-[#C7B0B7] group-hover:text-[#D95B72] dark:group-hover:text-[#FF9EB0] transition-colors">
                                  Chạm để mở Trang Kỷ Niệm
                                </div>
                              </div>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {(isLoading || isFollowUpTyping || isMoodStarterLoading) && (
                    <div className="flex flex-col items-start">
                      <div className="text-[10px] text-[#7D6B6D] dark:text-[#C7B0B7] mb-1 px-1">
                        {senderAlias} đang gõ...
                      </div>
                      <div className="px-3.5 py-2.5 rounded-2xl bg-white/95 dark:bg-[#2E2227]/90 border border-[#F3D1DC] dark:border-[#533D45] text-xs text-[#7D6B6D] dark:text-[#C7B0B7] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF8FA3] animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF8FA3] animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF8FA3] animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  )}

                  {chatError && !isLoading && !isFollowUpTyping && (
                    <div className="p-3 rounded-2xl bg-[#FFF6F8] dark:bg-[#312227] border border-[#F4C2CD] dark:border-[#6A4652] text-[11px] text-[#5E4B4E] dark:text-[#EAD8DE] space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-3.5 h-3.5 text-[#D95B72] dark:text-[#FF9EB0] shrink-0 mt-0.5" />
                          <span className="leading-relaxed">
                            {chatError.message}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setChatError(null)}
                          aria-label="Đóng thông báo lỗi"
                          className="p-0.5 rounded-md text-[#9E878A] hover:text-[#4A3B3E] dark:hover:text-[#F6EAEF] cursor-pointer shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      {chatError.retryable && (
                        <button
                          type="button"
                          onClick={() =>
                            sendMessage(chatError.failedText, {
                              reuseExistingUserMessage: true,
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FF8FA3] hover:bg-[#FF758F] dark:bg-[#E06D82] dark:hover:bg-[#CE5D72] text-white text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Thử gửi lại</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Contextual Quick Prompts */}
                <div className="px-3.5 py-2 bg-[#FFF0F3]/60 dark:bg-[#2A1F24]/85 backdrop-blur-sm border-t border-[#F7E4EA] dark:border-[#4A363D] shrink-0">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                    {getContextualQuickChips(
                      getClientTimeContext().localHour,
                      diaryEntries[0]?.emotion
                    ).map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        disabled={isLoading || isFollowUpTyping}
                        onClick={() => sendMessage(chip)}
                        className="px-2.5 py-1 rounded-lg bg-white/90 dark:bg-[#36282E] hover:bg-[#FFF0F3] dark:hover:bg-[#49323B] border border-[#F3D1DC] dark:border-[#533D45] text-[11px] text-[#4A3B3E] dark:text-[#F6EAEF] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage(input);
                  }}
                  className="p-2.5 sm:p-3 bg-white/90 dark:bg-[#271D21]/90 backdrop-blur-md border-t border-[#F7D6E0] dark:border-[#4F3941] flex items-center gap-2 shrink-0"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Nhắn cho ${senderAlias}...`}
                    className="flex-1 min-w-0 min-h-[44px] sm:min-h-0 px-3 py-2 rounded-xl bg-[#FFFDF9] dark:bg-[#1E161A] border border-[#F3D1DC] dark:border-[#533D45] text-base sm:text-xs text-[#4A3B3E] dark:text-[#F6EAEF] placeholder-[#B39EA1] dark:placeholder-[#9A8189] focus:outline-none focus:border-[#FF8FA3] dark:focus:border-[#E06D82]"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading || isFollowUpTyping}
                    aria-label="Gửi tin nhắn"
                    className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2.5 rounded-xl bg-[#FF8FA3] hover:bg-[#FF7A91] dark:bg-[#E06D82] dark:hover:bg-[#CE5D72] disabled:opacity-50 text-white transition-colors cursor-pointer shrink-0 shadow-xs inline-flex items-center justify-center"
                  >
                    <Send className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  </button>
                </form>
              </>
            )}

            {/* TAB 2: Daily Mood Diary (Nhật Ký Cảm Xúc Hàng Ngày) */}
            {activeStationTab === 'diary' && (
              <div className="flex-1 overflow-y-auto p-3.5 space-y-4 bg-[#FFFDF9]/85 dark:bg-[#1E161A]/85">
                {/* Quick Daily Emotion Check-in Card */}
                <form
                  onSubmit={handleAddDiaryEntry}
                  className="p-3.5 rounded-2xl bg-white dark:bg-[#2E2227] border border-[#F3D1DC] dark:border-[#533D45] shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold text-[#4A3B3E] dark:text-[#F6EAEF]">
                      Hôm nay nhịp cảm xúc của {herNickname} thế nào?
                    </span>
                    <span className="text-[10px] text-[#D95B72] dark:text-[#FF9EB0]">
                      {senderAlias} luôn đọc &amp; để lại lời nhắn
                    </span>
                  </div>

                  {/* 5 Emotion Selector Buttons */}
                  <div className="grid grid-cols-3 min-[380px]:grid-cols-5 gap-1.5">
                    {MOOD_DIARY_EMOTIONS.map((item) => {
                      const isSelected = selectedEmotion === item.key;
                      const { Icon, colorClass, bgClass, activeClass } =
                        getEmotionVisual(item.key);
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setSelectedEmotion(item.key)}
                          className={`min-h-[44px] p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                            isSelected ? activeClass : `${bgClass} opacity-80 hover:opacity-100`
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${colorClass}`} />
                          <span className="text-[10px] font-semibold leading-tight text-center whitespace-nowrap">
                            {item.shortLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Short Note Input + Submit */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={diaryNoteInput}
                      onChange={(e) => setDiaryNoteInput(e.target.value)}
                      placeholder={`Viết đôi dòng ngắn gọn về hôm nay của ${herNickname}...`}
                      className="flex-1 min-w-0 min-h-[44px] sm:min-h-0 px-3 py-2 rounded-xl bg-[#FFFDF9] dark:bg-[#1E161A] border border-[#F3D1DC] dark:border-[#533D45] text-base sm:text-xs text-[#4A3B3E] dark:text-[#F6EAEF] placeholder-[#B39EA1] dark:placeholder-[#9A8189] focus:outline-none focus:border-[#FF8FA3] dark:focus:border-[#E06D82]"
                    />
                    <button
                      type="submit"
                      className="min-h-[44px] sm:min-h-0 px-3.5 py-2 rounded-xl bg-[#FF8FA3] hover:bg-[#FF7A91] dark:bg-[#E06D82] dark:hover:bg-[#CE5D72] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-2xs"
                    >
                      Lưu lại
                    </button>
                  </div>

                  <AnimatePresence>
                    {diarySavedToast && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-[11px] font-medium text-[#2E7D5B] dark:text-[#7AD3A4] flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          Đã lưu vào nhật ký &amp; mở lời nhắn từ {senderAlias}!
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>

                {/* Chronological Mood Diary Entries & Messages from X */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1 text-[11px] text-[#7D6B6D] dark:text-[#C7B0B7]">
                    <span className="font-semibold text-[#4A3B3E] dark:text-[#F6EAEF]">
                      Các trang nhật ký đã lưu ({diaryEntries.length})
                    </span>
                    <span>Lời nhắn từ {senderAlias}</span>
                  </div>

                  {diaryEntries.map((entry) => {
                    const { Icon, colorClass, bgClass } = getEmotionVisual(
                      entry.emotion
                    );
                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3.5 rounded-2xl bg-white dark:bg-[#2E2227] border border-[#F3D1DC] dark:border-[#533D45] shadow-2xs space-y-2.5"
                      >
                        {/* Entry Header */}
                        <div className="flex items-center justify-between gap-2 text-[11px] text-[#7D6B6D] dark:text-[#C7B0B7]">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-6 h-6 rounded-lg border flex items-center justify-center ${bgClass}`}
                            >
                              <Icon className={`w-3.5 h-3.5 ${colorClass}`} />
                            </span>
                            <span className="font-semibold text-[#4A3B3E] dark:text-[#F6EAEF]">
                              {entry.emotionLabel}
                            </span>
                          </div>
                          <span className="tabular-nums text-[10px]">
                            {entry.createdAt}
                          </span>
                        </div>

                        {/* Her short note */}
                        <p className="text-xs text-[#4A3B3E] dark:text-[#F6EAEF] leading-relaxed pl-1">
                          &ldquo;{entry.shortNote}&rdquo;
                        </p>

                        {/* Preset message from X based on her emotion */}
                        <div className="p-2.5 rounded-xl bg-[#FFFDF9]/90 dark:bg-[#23191D]/90 border border-[#F7E4EA] dark:border-[#4A363D] text-[11px] leading-relaxed text-[#4A3B3E] dark:text-[#F6EAEF]">
                          <div className="flex items-center gap-1 text-[10px] font-semibold text-[#D95B72] dark:text-[#FF9EB0] mb-0.5">
                            <Heart className="w-3 h-3 text-[#FF8FA3] fill-[#FF8FA3]" />
                            <span>
                              Lời nhắn {senderAlias} gửi theo cảm xúc của cậu:
                            </span>
                          </div>
                          <p className="italic text-[#5E4B4E] dark:text-[#DFCBD2]">
                            {entry.presetMessage}
                          </p>
                        </div>

                        {/* Personal custom reply written by Admin for this specific day */}
                        {entry.customAdminReply && (
                          <div className="p-2.5 rounded-xl bg-[#FFF0F3] dark:bg-[#3A2930] border border-[#FFCCD5] dark:border-[#6A4A56] text-[11px] leading-relaxed text-[#4A3B3E] dark:text-[#F6EAEF]">
                            <div className="flex items-center gap-1 text-[10px] font-semibold text-[#D95B72] dark:text-[#FF9EB0] mb-0.5">
                              <MessageSquareHeart className="w-3 h-3 text-[#FF6B88] dark:text-[#FF9EB0]" />
                              <span>
                                Đôi dòng riêng {senderAlias} viết cho ngày hôm nay của {herNickname}:
                              </span>
                            </div>
                            <p
                              className="italic text-[#4A3B3E] dark:text-[#F6EAEF]"
                              style={{
                                fontFamily: 'var(--font-playfair), serif',
                              }}
                            >
                              &ldquo;{entry.customAdminReply}&rdquo;
                            </p>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Trigger Button & Proactive Reminder Bubble (Bottom-Right Corner) */}
      <div className="pointer-events-auto flex flex-col items-end gap-2.5 w-full sm:w-auto">
        {/* Gentle Proactive Reminder Card Bubble */}
        <AnimatePresence>
          {!isOpen && activeBubbleReminder && (
            <motion.div
              key={activeBubbleReminder.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-full sm:max-w-[325px] p-3.5 rounded-2xl bg-white/95 dark:bg-[#2A1F24]/95 backdrop-blur-xl border border-[#FFCCD5] dark:border-[#5D414B] shadow-[0_14px_38px_rgba(255,143,163,0.28)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] text-xs text-[#4A3B3E] dark:text-[#F6EAEF]"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-[#FFF0F3] dark:bg-[#3F2B33] border border-[#FFCCD5] dark:border-[#6A4A56] flex items-center justify-center shrink-0">
                    <Heart className="w-2.5 h-2.5 text-[#FF8FA3] fill-[#FF8FA3]" />
                  </span>
                  <span className="text-[11px] font-semibold text-[#D95B72] dark:text-[#FF9EB0] truncate">
                    {senderAlias} ·{' '}
                    {activeBubbleReminder.moodContext
                      ? `Theo cảm xúc (${activeBubbleReminder.moodContext})`
                      : getProactiveTopicLabel(activeBubbleReminder.reminderTopic)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveBubbleReminder(null)}
                  aria-label="Đóng lời nhắc"
                  className="min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 p-1 rounded-lg inline-flex items-center justify-center text-[#B39EA1] dark:text-[#9A8189] hover:text-[#4A3B3E] dark:hover:text-[#F6EAEF] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2930] transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>

              <p className="text-xs leading-relaxed text-[#4A3B3E] dark:text-[#F6EAEF]">
                {activeBubbleReminder.text}
              </p>

              {activeBubbleReminder.relatedPhoto &&
                activeBubbleReminder.relatedPhoto.imageUrl && (
                  <div className="mt-2.5 p-2 rounded-xl bg-[#FFFDF9]/90 dark:bg-[#22191D]/90 border border-[#F7D6E0] dark:border-[#533D45] flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeBubbleReminder.relatedPhoto.imageUrl}
                      alt={activeBubbleReminder.relatedPhoto.caption}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-lg object-cover border border-[#FFCCD5] dark:border-[#5D414B] shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-semibold text-[#D95B72] dark:text-[#FF9EB0] tabular-nums">
                        {activeBubbleReminder.relatedPhoto.date}
                      </div>
                      <div className="text-[11px] font-medium text-[#4A3B3E] dark:text-[#F6EAEF] truncate">
                        {activeBubbleReminder.relatedPhoto.caption}
                      </div>
                    </div>
                  </div>
                )}

              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveStationTab('chat');
                    setIsOpen(true);
                  }}
                  className="flex-1 min-h-[40px] sm:min-h-0 py-1.5 px-3 rounded-xl bg-[#FF8FA3] hover:bg-[#FF758F] dark:bg-[#E06D82] dark:hover:bg-[#CE5D72] text-white text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  Trả lời {senderAlias}
                </button>
                {activeBubbleReminder.relatedPhoto && onNavigateToGallery && (
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateToGallery();
                      setActiveBubbleReminder(null);
                    }}
                    className="min-h-[40px] sm:min-h-0 py-1.5 px-2.5 rounded-xl bg-[#FFF0F3] dark:bg-[#3A2930] hover:bg-[#FFE5EC] dark:hover:bg-[#49323B] text-[#D95B72] dark:text-[#FF9EB0] text-[11px] font-semibold border border-[#FFCCD5] dark:border-[#6A4A56] transition-colors cursor-pointer"
                  >
                    Xem ảnh
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Corner Trigger (Desktop md+ only; mobile uses unified 4-button bottom nav) */}
        <div className="hidden md:flex items-center gap-2.5">
          {/* Subtle greeting bubble when closed and no proactive card active */}
          <AnimatePresence>
            {!isOpen && !activeBubbleReminder && showTooltip && (
              <motion.div
                initial={{ opacity: 0, x: 10, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 10, scale: 0.95 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 dark:bg-[#2A1F24]/90 backdrop-blur-md border border-[#FFCCD5] dark:border-[#5D414B] shadow-[0_6px_20px_rgba(255,143,163,0.25)] dark:shadow-[0_10px_28px_rgba(0,0,0,0.42)] text-xs text-[#4A3B3E] dark:text-[#F6EAEF]"
              >
                <Sparkles className="w-3 h-3 text-[#FF8FA3]" />
                <span>Tâm sự &amp; lưu nhật ký cùng {senderAlias} nhé?</span>
                <button
                  type="button"
                  onClick={() => setShowTooltip(false)}
                  className="text-[#B39EA1] dark:text-[#9A8189] hover:text-[#4A3B3E] dark:hover:text-[#F6EAEF] ml-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Mở Trạm Lắng Nghe cùng X"
            className="relative inline-flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-[#FF8FA3] to-[#FF758F] dark:from-[#E06D82] dark:to-[#C9586E] text-white shadow-[0_8px_25px_rgba(255,117,143,0.45)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.45)] hover:shadow-[0_12px_30px_rgba(255,117,143,0.55)] transition-colors cursor-pointer"
          >
            <span className="inline-flex">
              <MessageCircleHeart className="w-5 h-5 fill-white/20" />
            </span>
            <span className="text-xs font-semibold tracking-wide">
              {isOpen ? 'Thu gọn' : `Tâm Sự Cùng ${senderAlias}`}
            </span>
            {!isOpen && unreadCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-white dark:bg-[#1E161A] text-[#D95B72] dark:text-[#FF9EB0] text-[10px] font-bold inline-flex items-center justify-center shadow-2xs tabular-nums">
                {unreadCount}
              </span>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
