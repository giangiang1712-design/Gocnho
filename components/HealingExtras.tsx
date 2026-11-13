'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Award,
  CheckCircle2,
  CloudSun,
  Coffee,
  Feather,
  Gamepad2,
  Gift,
  Heart,
  HeartHandshake,
  MessageSquareHeart,
  PartyPopper,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  Sparkles,
  Star,
  StickyNote,
  Sun,
} from 'lucide-react';
import {
  DataService,
  DEFAULT_WISH_OPTIONS,
  playPaperFlipSound,
} from '@/lib/data-service';
import type {
  AppSettings,
  MoodJarItem,
  UserRole,
  WishEntry,
} from '@/lib/types';

interface HealingExtrasProps {
  userRole: UserRole;
  moodJars: MoodJarItem[];
  onMoodJarsChange: (jars: MoodJarItem[]) => void;
  wishes: WishEntry[];
  onWishesChange: (wishes: WishEntry[]) => void;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  onSelectMoodContext: (moodTitle: string) => void;
  onSelectWishContext: (wishTitle: string) => void;
  onOpenMiniGame?: () => void;
}

const getMoodJarVisual = (jarId: string, index: number) => {
  if (jarId.includes('happy') || index === 0) {
    return {
      Icon: Sun,
      badgeBg: 'bg-[#FFF5D6] dark:bg-[#3A2E1B] border-[#FFE08A] dark:border-[#6A532B]',
      iconColor: 'text-[#E09F24] dark:text-[#F4C96B]',
      tagLabel: 'Nắng ấm rạng rỡ',
    };
  }
  if (jarId.includes('tired') || index === 1) {
    return {
      Icon: Coffee,
      badgeBg: 'bg-[#FFF0F3] dark:bg-[#3F2831] border-[#FFCCD5] dark:border-[#6A4250]',
      iconColor: 'text-[#D95B72] dark:text-[#FF9EB0]',
      tagLabel: 'Trạm sạc dịu êm',
    };
  }
  if (jarId.includes('stress') || index === 2) {
    return {
      Icon: CloudSun,
      badgeBg: 'bg-[#EAF4FF] dark:bg-[#233242] border-[#BDE0FE] dark:border-[#3E5C78]',
      iconColor: 'text-[#4A8BC2] dark:text-[#8BC4F5]',
      tagLabel: 'Thở nhẹ bình yên',
    };
  }
  return {
    Icon: HeartHandshake,
    badgeBg: 'bg-[#F5EBFF] dark:bg-[#312540] border-[#DEC9F9] dark:border-[#564170]',
    iconColor: 'text-[#8B5CF6] dark:text-[#C4A6FF]',
    tagLabel: 'Góc nhỏ lắng nghe',
  };
};

interface ConfettiParticle {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  color: string;
  shape: 'ribbon' | 'circle' | 'diamond' | 'star';
  delay: number;
  duration: number;
}

const CONFETTI_PARTICLES: ConfettiParticle[] = [
  { x: -115, y: -85, rotate: -145, scale: 1.1, color: '#FF8FA3', shape: 'ribbon', delay: 0, duration: 0.95 },
  { x: -88, y: -118, rotate: 120, scale: 0.95, color: '#FFD166', shape: 'circle', delay: 0.02, duration: 1.05 },
  { x: -62, y: -74, rotate: -95, scale: 1.15, color: '#BDE0FE', shape: 'diamond', delay: 0.04, duration: 0.9 },
  { x: -38, y: -126, rotate: 180, scale: 1.0, color: '#CDB4DB', shape: 'star', delay: 0.01, duration: 1.1 },
  { x: -14, y: -98, rotate: -65, scale: 1.2, color: '#FF6B88', shape: 'ribbon', delay: 0.03, duration: 0.98 },
  { x: 12, y: -124, rotate: 140, scale: 0.9, color: '#A8E6CF', shape: 'circle', delay: 0.02, duration: 1.08 },
  { x: 36, y: -92, rotate: -110, scale: 1.15, color: '#FFD166', shape: 'star', delay: 0.05, duration: 0.96 },
  { x: 64, y: -116, rotate: 165, scale: 1.05, color: '#FF8FA3', shape: 'diamond', delay: 0.01, duration: 1.04 },
  { x: 92, y: -82, rotate: -130, scale: 1.0, color: '#CDB4DB', shape: 'ribbon', delay: 0.04, duration: 0.94 },
  { x: 118, y: -104, rotate: 110, scale: 0.9, color: '#BDE0FE', shape: 'circle', delay: 0.06, duration: 1.02 },
  { x: -75, y: -48, rotate: 85, scale: 0.85, color: '#A8E6CF', shape: 'diamond', delay: 0.07, duration: 0.88 },
  { x: 78, y: -52, rotate: -80, scale: 0.9, color: '#FFB3C1', shape: 'ribbon', delay: 0.07, duration: 0.88 },
  { x: -24, y: -64, rotate: 95, scale: 0.85, color: '#FFD166', shape: 'circle', delay: 0.08, duration: 0.9 },
  { x: 28, y: -68, rotate: -120, scale: 1.0, color: '#FF6B88', shape: 'star', delay: 0.06, duration: 0.92 },
];

interface ConfettiWave {
  id: number;
  jarId: string;
}

export default function HealingExtras({
  userRole,
  moodJars,
  onMoodJarsChange,
  wishes,
  onWishesChange,
  settings,
  onSettingsChange,
  onSelectMoodContext,
  onSelectWishContext,
  onOpenMiniGame,
}: HealingExtrasProps) {
  const [activeJarId, setActiveJarId] = useState<string>(
    moodJars[0]?.id || 'jar-happy'
  );
  const [messageIndex, setMessageIndex] = useState<number>(0);
  const [newJarMessage, setNewJarMessage] = useState('');
  const [confettiWaves, setConfettiWaves] = useState<ConfettiWave[]>([]);
  const confettiSeqRef = useRef(0);

  // Wish Jar (Hũ Điều Ước) state for Quỳnh Anh
  const WISH_CATEGORIES = [
    'Đồ ngọt / Trà sữa',
    'Hẹn hò & Đi dạo',
    'Thư giãn & Nghỉ ngơi',
    'Điều ước bí mật',
  ];
  const [selectedWishTitle, setSelectedWishTitle] = useState<string>(
    DEFAULT_WISH_OPTIONS[0]?.title || 'Một ly trà sữa ngọt dịu'
  );
  const [selectedWishCategory, setSelectedWishCategory] = useState<string>(
    WISH_CATEGORIES[0]
  );
  const [wishNoteInput, setWishNoteInput] = useState<string>('');
  const [isSendingWish, setIsSendingWish] = useState<boolean>(false);
  const [wishSentToast, setWishSentToast] = useState<boolean>(false);
  const [justDroppedWish, setJustDroppedWish] = useState<boolean>(false);

  // Admin settings edit state (strictly for role 'thanh')
  const [nicknameInput, setNicknameInput] = useState(settings.herNickname);
  const [welcomeInput, setWelcomeInput] = useState(settings.welcomeNote);
  const [headerNoteInput, setHeaderNoteInput] = useState(
    settings.secretHeaderNote
  );
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  const activeJar =
    moodJars.find((j) => j.id === activeJarId) || moodJars[0];
  const currentMessage =
    activeJar?.messages[messageIndex % activeJar.messages.length] ||
    'Mong những ngày tháng sắp tới của Quỳnh Anh luôn ngập tràn niềm vui.';

  const triggerConfetti = (jarId: string) => {
    confettiSeqRef.current += 1;
    const waveId = confettiSeqRef.current;
    setConfettiWaves((prev) => [...prev, { id: waveId, jarId }]);
    setTimeout(() => {
      setConfettiWaves((prev) => prev.filter((w) => w.id !== waveId));
    }, 1250);
  };

  const handleOpenJar = (jar: MoodJarItem) => {
    playPaperFlipSound();
    setActiveJarId(jar.id);
    setMessageIndex((prev) =>
      jar.id === activeJarId ? (prev + 1) % jar.messages.length : 0
    );
    onSelectMoodContext(jar.title);
    triggerConfetti(jar.id);
  };

  const handleNextMessage = () => {
    if (!activeJar) return;
    playPaperFlipSound();
    setMessageIndex((prev) => (prev + 1) % activeJar.messages.length);
    triggerConfetti(activeJar.id);
  };

  const handleSendWishNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWishTitle.trim() && !wishNoteInput.trim()) return;
    setIsSendingWish(true);
    try {
      playPaperFlipSound();
      const titleToSave =
        selectedWishTitle.trim() || 'Điều ước nhỏ của Quỳnh Anh';
      const noteToSave =
        wishNoteInput.trim() ||
        `Một điều ước nhỏ ${settings.herNickname} thả vào hũ gửi ${
          settings.senderAlias || 'X'
        }.`;
      const created = await DataService.addWish(
        titleToSave,
        noteToSave,
        selectedWishCategory
      );
      onWishesChange([created, ...wishes]);
      onSelectWishContext(created.title);
      triggerConfetti(activeJar?.id || 'jar-happy');
      setWishNoteInput('');
      setJustDroppedWish(true);
      setWishSentToast(true);
      setTimeout(() => setJustDroppedWish(false), 1400);
      setTimeout(() => setWishSentToast(false), 3500);
    } finally {
      setIsSendingWish(false);
    }
  };

  const handleAddJarMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJarMessage.trim() || !activeJar || userRole !== 'thanh') return;

    const updatedJars = moodJars.map((jar) =>
      jar.id === activeJar.id
        ? { ...jar, messages: [newJarMessage.trim(), ...jar.messages] }
        : jar
    );
    onMoodJarsChange(updatedJars);
    DataService.saveMoodJars(updatedJars);
    setNewJarMessage('');
    setMessageIndex(0);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'thanh') return;
    const updated: AppSettings = {
      ...settings,
      herNickname: nicknameInput.trim() || 'Quỳnh Anh',
      welcomeNote: welcomeInput.trim() || settings.welcomeNote,
      secretHeaderNote: headerNoteInput.trim() || settings.secretHeaderNote,
    };
    DataService.saveSettings(updated);
    onSettingsChange(updated);
    setSettingsSavedToast(true);
    setTimeout(() => setSettingsSavedToast(false), 3000);
  };

  return (
    <section id="healing-jars" className="w-full space-y-12">
      {/* Hũ Kẹo Cảm Xúc (4 Mood Jars) */}
      <div className="bg-white dark:bg-[#271D21] rounded-3xl border border-[#F7D6E0] dark:border-[#4A363D] shadow-[0_14px_40px_rgba(255,143,163,0.12)] dark:shadow-[0_18px_48px_rgba(0,0,0,0.42)] p-4 sm:p-6 lg:p-10 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-[#7D6B6D] dark:text-[#C7B0B7] mb-1.5 inline-flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5 text-[#FF8FA3]" />
              <span>
                Hũ Kẹo Cảm Xúc · 4 lọ tinh thần tớ chuẩn bị dành tặng {settings.herNickname}
              </span>
            </p>
            <h2
              className="text-2xl sm:text-3xl font-semibold text-[#4A3B3E] dark:text-[#F6EAEF]"
              style={{ fontFamily: 'var(--font-playfair), serif', textWrap: 'balance' }}
            >
              Hôm Nay Tâm Trạng Của {settings.herNickname} Thế Nào?
            </h2>
            <p className="text-sm text-[#7D6B6D] dark:text-[#C7B0B7] mt-2 leading-relaxed">
              Cứ chạm vào chiếc hũ tương ứng với cảm xúc lúc này để mở viên kẹo lời
              nhắn tớ gửi riêng cho cậu nhé.
            </p>
          </div>

          {/* Subtle, low-text entry to Healing Mini-Game Modal */}
          {onOpenMiniGame && (
            <motion.button
              type="button"
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={onOpenMiniGame}
              className="self-start inline-flex items-center gap-2 px-3.5 py-2 min-h-[44px] sm:min-h-0 rounded-2xl bg-[#FFFDF9] dark:bg-[#312429] hover:bg-[#FFF0F3] dark:hover:bg-[#3D2C33] border border-[#F3D1DC] dark:border-[#533D45] text-xs font-semibold text-[#D95B72] dark:text-[#FF9EB0] shadow-2xs transition-colors cursor-pointer shrink-0"
              title="Mở góc nhỏ chơi mini-game giải tỏa căng thẳng"
            >
              <span className="w-6 h-6 rounded-xl bg-[#FFF0F3] dark:bg-[#432B34] border border-[#FFCCD5] dark:border-[#5D414B] flex items-center justify-center text-[#FF8FA3]">
                <Gamepad2 className="w-3.5 h-3.5" />
              </span>
              <span>Góc Nhỏ Giải Khuây</span>
              <Sparkles className="w-3 h-3 text-[#F4B860]" />
            </motion.button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* 4 Mood Jars Selector */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {moodJars.map((jar, jarIndex) => {
              const isSelected = jar.id === activeJar?.id;
              const jarWaves = confettiWaves.filter((w) => w.jarId === jar.id);
              const { Icon: JarIcon, badgeBg, iconColor, tagLabel } =
                getMoodJarVisual(jar.id, jarIndex);

              return (
                <motion.button
                  key={jar.id}
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleOpenJar(jar)}
                  className={`relative p-4 sm:p-5 rounded-2xl border text-left transition-colors cursor-pointer flex flex-col justify-between overflow-visible ${
                    isSelected
                      ? 'bg-[#FFF0F3] dark:bg-[#3D2830] border-[#FF8FA3] dark:border-[#E06D82] shadow-[0_12px_28px_rgba(255,143,163,0.22)] dark:shadow-[0_14px_32px_rgba(0,0,0,0.45)]'
                      : 'bg-[#FFFDF9] dark:bg-[#241A1E] border-[#F3D1DC] dark:border-[#4F3941] hover:bg-[#FFF0F3]/60 dark:hover:bg-[#312429]'
                  }`}
                >
                  {/* Mini Confetti Burst directly from the clicked Jar Card */}
                  <AnimatePresence>
                    {jarWaves.map((wave) => (
                      <div
                        key={`jar-confetti-${wave.id}`}
                        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30"
                      >
                        {CONFETTI_PARTICLES.slice(0, 10).map((p, idx) => (
                          <motion.span
                            key={`jar-p-${wave.id}-${idx}`}
                            initial={{ opacity: 1, x: 0, y: 0, scale: 0.3, rotate: 0 }}
                            animate={{
                              opacity: [1, 1, 0],
                              x: [0, p.x * 0.55, p.x * 0.78],
                              y: [0, p.y * 0.65, p.y * 0.25 + 24],
                              scale: [0.3, p.scale, p.scale * 0.6],
                              rotate: [0, p.rotate],
                            }}
                            exit={{ opacity: 0 }}
                            transition={{
                              duration: p.duration,
                              delay: p.delay,
                              ease: 'easeOut',
                            }}
                            style={{ backgroundColor: p.shape !== 'star' ? p.color : undefined, color: p.color }}
                            className={`absolute block ${
                              p.shape === 'circle'
                                ? 'w-2.5 h-2.5 rounded-full'
                                : p.shape === 'ribbon'
                                ? 'w-3 h-1.5 rounded-xs'
                                : p.shape === 'diamond'
                                ? 'w-2.5 h-2.5 rotate-45 rounded-[2px]'
                                : ''
                            }`}
                          >
                            {p.shape === 'star' && (
                              <Sparkles className="w-3.5 h-3.5 fill-current" />
                            )}
                          </motion.span>
                        ))}
                      </div>
                    ))}
                  </AnimatePresence>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <motion.div
                        animate={
                          isSelected
                            ? { rotate: [0, -6, 6, 0], scale: [1, 1.06, 1] }
                            : { rotate: 0, scale: 1 }
                        }
                        transition={{ duration: 0.45, ease: 'easeInOut' }}
                        className={`w-11 h-11 rounded-2xl border flex items-center justify-center shadow-2xs ${badgeBg}`}
                      >
                        <JarIcon className={`w-5 h-5 ${iconColor}`} />
                      </motion.div>

                      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white/90 dark:bg-[#1E161A]/80 border border-[#F3D1DC] dark:border-[#533D45] text-[#7D6B6D] dark:text-[#C7B0B7]">
                        {tagLabel}
                      </span>
                    </div>

                    <h3
                      className="text-lg font-semibold text-[#4A3B3E] dark:text-[#F6EAEF]"
                      style={{ fontFamily: 'var(--font-playfair), serif' }}
                    >
                      {jar.title}
                    </h3>
                    <p className="text-xs text-[#7D6B6D] dark:text-[#C7B0B7] mt-1">{jar.subtitle}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#F7E4EA] dark:border-[#4A363D] flex items-center justify-between text-[11px] text-[#D95B72] dark:text-[#FF9EB0] font-medium">
                    <span className="tabular-nums">
                      {jar.messages.length} viên kẹo lời nhắn
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span>Mở hũ</span>
                      <span>→</span>
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Unfolded Healing Note Card with Celebration Confetti Shower & Wax Seal */}
          <div className="lg:col-span-6 flex flex-col relative">
            {/* Confetti Celebration Shower over the Note Card */}
            <AnimatePresence>
              {confettiWaves.map((wave) => (
                <div
                  key={`card-confetti-${wave.id}`}
                  className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 z-30"
                >
                  {CONFETTI_PARTICLES.map((p, idx) => (
                    <motion.span
                      key={`card-p-${wave.id}-${idx}`}
                      initial={{ opacity: 1, x: 0, y: 10, scale: 0.35, rotate: 0 }}
                      animate={{
                        opacity: [1, 1, 0],
                        x: [0, p.x * 0.75, p.x * 1.15],
                        y: [10, p.y * 0.85, p.y * 0.2 + 42],
                        scale: [0.35, p.scale * 1.15, p.scale * 0.7],
                        rotate: [0, p.rotate * 0.6, p.rotate],
                      }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: p.duration,
                        delay: p.delay,
                        ease: 'easeOut',
                      }}
                      style={{
                        backgroundColor: p.shape !== 'star' ? p.color : undefined,
                        color: p.color,
                      }}
                      className={`absolute block shadow-2xs ${
                        p.shape === 'circle'
                          ? 'w-2.5 h-2.5 rounded-full'
                          : p.shape === 'ribbon'
                          ? 'w-3.5 h-1.5 rounded-xs'
                          : p.shape === 'diamond'
                          ? 'w-2.5 h-2.5 rotate-45 rounded-[2px]'
                          : ''
                      }`}
                    >
                      {p.shape === 'star' && (
                        <Sparkles className="w-4 h-4 fill-current drop-shadow-xs" />
                      )}
                    </motion.span>
                  ))}
                </div>
              ))}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeJar?.id}-${messageIndex}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex-1 bg-[#FFFDF9] dark:bg-[#23191D] rounded-2xl border border-[#FFB3C1] dark:border-[#5D414B] p-4 sm:p-8 flex flex-col justify-between shadow-[0_12px_34px_rgba(255,143,163,0.16)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.42)] relative overflow-hidden"
              >
                {/* Decorative Wax-Seal Stamp Corner Badge */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-[#FFF0F3]/70 dark:bg-[#3A2930]/60 border border-[#F7D6E0] dark:border-[#5D414B] flex items-center justify-center opacity-60"
                >
                  <Award className="w-12 h-12 text-[#FF8FA3]" />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-2 text-xs text-[#7D6B6D] dark:text-[#C7B0B7] mb-4">
                    <span className="inline-flex items-center gap-1.5">
                      <PartyPopper className="w-3.5 h-3.5 text-[#FF8FA3]" />
                      <span>
                        Thiệp tinh thần ·{' '}
                        <strong className="text-[#D95B72] dark:text-[#FF9EB0]">{activeJar?.title}</strong>
                      </span>
                    </span>
                    <span className="tabular-nums px-2.5 py-0.5 rounded-full bg-[#FFF0F3] dark:bg-[#3A2930] text-[#D95B72] dark:text-[#FF9EB0] font-semibold">
                      Lá thư #{messageIndex + 1}/{activeJar?.messages.length || 1}
                    </span>
                  </div>

                  <p
                    className="text-lg sm:text-xl italic text-[#4A3B3E] dark:text-[#F6EAEF] leading-relaxed my-4"
                    style={{ fontFamily: 'var(--font-playfair), serif' }}
                  >
                    &ldquo;{currentMessage}&rdquo;
                  </p>
                </div>

                <div className="relative z-10 mt-6 pt-4 border-t border-[#F7E4EA] dark:border-[#4A363D] flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-xs font-medium text-[#7D6B6D] dark:text-[#C7B0B7] inline-flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-[#FF6B88] fill-[#FF6B88]" />
                    <span>Nhắn gửi từ {settings.senderAlias || 'X'}</span>
                  </span>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={handleNextMessage}
                    className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FFF0F3] dark:bg-[#3A2930] hover:bg-[#FFE5EC] dark:hover:bg-[#49323B] text-[#D95B72] dark:text-[#FF9EB0] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Đọc thêm viên kẹo khác</span>
                  </motion.button>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Admin Quick-Add Message to Current Jar (Strictly for role 'thanh') */}
            {userRole === 'thanh' && (
              <form
                onSubmit={handleAddJarMessage}
                className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
              >
                <input
                  type="text"
                  value={newJarMessage}
                  onChange={(e) => setNewJarMessage(e.target.value)}
                  placeholder={`Thêm thông điệp mới vào ${activeJar?.title}...`}
                  className="flex-1 px-3.5 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FFFDF9] dark:bg-[#1E161A]/90 border border-[#F3D1DC] dark:border-[#533D45] text-base sm:text-xs text-[#4A3B3E] dark:text-[#F6EAEF] placeholder-[#B39EA1] dark:placeholder-[#9A8189] focus:outline-none focus:border-[#FF8FA3]"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FF8FA3] dark:bg-[#E06D82] text-white text-xs font-medium hover:bg-[#FF7A91] dark:hover:bg-[#CE5D72] cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm vào hũ</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Hũ Điều Ước & Giấy Note Của Quỳnh Anh (Wish Jar đồng bộ hai chiều tới Anh Thành) */}
      <div
        id="wish-mailbox"
        className="bg-white dark:bg-[#271D21] rounded-3xl border border-[#F7D6E0] dark:border-[#4A363D] shadow-[0_14px_40px_rgba(255,143,163,0.12)] dark:shadow-[0_18px_48px_rgba(0,0,0,0.42)] p-4 sm:p-6 lg:p-10 relative overflow-hidden"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-[#7D6B6D] dark:text-[#C7B0B7] mb-1.5 inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FF8FA3]" />
              <span>
                Hũ Điều Ước Bí Mật (Wish Jar) · Gửi thẳng tới góc quản lý của{' '}
                {settings.senderAlias || 'X'}
              </span>
            </p>
            <h2
              className="text-2xl sm:text-3xl font-semibold text-[#4A3B3E] dark:text-[#F6EAEF]"
              style={{
                fontFamily: 'var(--font-playfair), serif',
                textWrap: 'balance',
              }}
            >
              Hũ Điều Ước Của {settings.herNickname}
            </h2>
            <p className="text-sm text-[#7D6B6D] dark:text-[#C7B0B7] mt-2 leading-relaxed">
              Hôm nay cậu chợt thèm một ly trà sữa, muốn đi dạo một vòng cho thoáng hay ấp ủ một điều nhỏ xinh nào? Hãy gấp mảnh giấy điều ước thả vào chiếc hũ này nhé, {settings.senderAlias || 'X'} sẽ nhận được ngay để chuẩn bị bất ngờ cho cậu!
            </p>
          </div>

          {/* Glass Wish Jar Visual */}
          <div className="relative self-start md:self-auto flex items-center gap-4 px-5 py-3.5 rounded-2xl bg-gradient-to-br from-[#FFFDF9] to-[#FFF0F3] dark:from-[#2F2227] dark:to-[#3A2930] border border-[#F3D1DC] dark:border-[#5D414B] shadow-xs shrink-0">
            <div className="relative w-14 h-16 flex flex-col items-center justify-end">
              {/* Jar Lid */}
              <div className="w-9 h-2 rounded-t-md bg-[#F7C6D4] dark:bg-[#7A4B5B] border border-[#EFA4B9] dark:border-[#9A6376] z-10" />
              {/* Jar Glass Body */}
              <div className="w-12 h-13 rounded-b-2xl rounded-t-md bg-white/95 dark:bg-[#1E161A]/95 border-2 border-[#FFB3C1] dark:border-[#8C5A6B] shadow-inner relative overflow-hidden flex items-center justify-center">
                {/* Tiny stars glowing inside the jar */}
                <div className="grid grid-cols-3 gap-0.5 p-1 opacity-90">
                  {Array.from({ length: Math.min(9, Math.max(3, wishes.length)) }).map(
                    (_, i) => (
                      <span key={i}>
                        <Star
                          className={`w-2.5 h-2.5 ${
                            i % 2 === 0
                              ? 'text-[#FF8FA3] fill-[#FF8FA3]'
                              : 'text-[#F4B860] fill-[#F4B860]'
                          }`}
                        />
                      </span>
                    )
                  )}
                </div>

                {/* Star Drop Animation when a new wish is submitted */}
                <AnimatePresence>
                  {justDroppedWish && (
                    <motion.div
                      initial={{ y: -26, scale: 1.4, opacity: 1, rotate: -15 }}
                      animate={{ y: 8, scale: 0.9, opacity: 0, rotate: 20 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.95, ease: 'easeIn' }}
                      className="absolute inset-x-0 top-0 flex justify-center pointer-events-none"
                    >
                      <Heart className="w-5 h-5 text-[#FF6B88] fill-[#FF6B88]" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-medium text-[#7D6B6D] dark:text-[#C7B0B7]">
                Trong hũ đang giữ
              </div>
              <div
                className="text-lg font-semibold text-[#D95B72] dark:text-[#FF9EB0] tabular-nums"
                style={{ fontFamily: 'var(--font-playfair), serif' }}
              >
                {wishes.length} điều ước
              </div>
              <div className="text-[10px] text-[#2E7D5B] dark:text-[#7AD3A4] font-medium">
                {wishes.filter((w) => w.fulfilledByThanh).length} điều đã thành hiện thực
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Write & Drop a Wish into the Jar */}
          <form
            onSubmit={handleSendWishNote}
            className="lg:col-span-5 bg-[#FFFDF9] dark:bg-[#23191D] rounded-2xl border border-[#F3D1DC] dark:border-[#533D45] p-4 sm:p-6 space-y-4 shadow-xs"
          >
            <div>
              <label className="block text-xs font-semibold text-[#4A3B3E] dark:text-[#F6EAEF] mb-2">
                1. Phân loại điều ước của {settings.herNickname}
              </label>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {WISH_CATEGORIES.map((category) => {
                  const active = selectedWishCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedWishCategory(category)}
                      className={`px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-xl text-[11px] font-medium border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#FF8FA3] dark:bg-[#E06D82] text-white border-[#FF8FA3] dark:border-[#E06D82] shadow-2xs'
                          : 'bg-white dark:bg-[#312429] text-[#7D6B6D] dark:text-[#C7B0B7] border-[#F3D1DC] dark:border-[#533D45] hover:text-[#4A3B3E] dark:hover:text-[#F6EAEF]'
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>

              <label className="block text-xs font-semibold text-[#4A3B3E] dark:text-[#F6EAEF] mb-2">
                2. Chọn nhanh gợi ý hoặc tự viết điều ước
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                {DEFAULT_WISH_OPTIONS.map((opt) => {
                  const active = selectedWishTitle === opt.title;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedWishTitle(opt.title)}
                      className={`px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 rounded-xl border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#FFF0F3] dark:bg-[#3D2830] border-[#FF8FA3] dark:border-[#E06D82] text-[#D95B72] dark:text-[#FF9EB0] shadow-2xs'
                          : 'bg-white dark:bg-[#312429] border-[#F3D1DC] dark:border-[#533D45] text-[#4A3B3E] dark:text-[#F6EAEF] hover:bg-[#FFF0F3]/50 dark:hover:bg-[#38292F]'
                      }`}
                    >
                      <div className="text-xs font-semibold truncate">
                        {opt.title}
                      </div>
                      <div className="text-[10px] text-[#7D6B6D] dark:text-[#C7B0B7] truncate">
                        {opt.subtitle}
                      </div>
                    </button>
                  );
                })}
              </div>

              <input
                type="text"
                value={selectedWishTitle}
                onChange={(e) => setSelectedWishTitle(e.target.value)}
                placeholder="Hoặc tự nhập điều ước riêng của cậu..."
                className="w-full px-3.5 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-white dark:bg-[#1E161A]/90 border border-[#F3D1DC] dark:border-[#533D45] text-base sm:text-xs font-medium text-[#4A3B3E] dark:text-[#F6EAEF] placeholder-[#B39EA1] dark:placeholder-[#9A8189] focus:outline-none focus:border-[#FF8FA3]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4A3B3E] dark:text-[#F6EAEF] mb-1.5">
                3. Đôi dòng chi tiết nhắn gửi {settings.senderAlias || 'X'}
              </label>
              <textarea
                rows={3}
                value={wishNoteInput}
                onChange={(e) => setWishNoteInput(e.target.value)}
                placeholder={`Viết chi tiết điều ước hoặc thời gian cậu mong muốn để ${settings.senderAlias || 'X'} chuẩn bị thật chu đáo nhé...`}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1E161A]/90 border border-[#F3D1DC] dark:border-[#533D45] text-base sm:text-xs text-[#4A3B3E] dark:text-[#F6EAEF] placeholder-[#B39EA1] dark:placeholder-[#9A8189] focus:outline-none focus:border-[#FF8FA3] leading-relaxed"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <motion.button
                type="submit"
                disabled={isSendingWish}
                whileTap={{ scale: 0.96 }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FF8FA3] hover:bg-[#FF7A91] dark:bg-[#E06D82] dark:hover:bg-[#CE5D72] text-white text-xs font-semibold shadow-[0_8px_20px_rgba(255,143,163,0.3)] transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {isSendingWish
                    ? 'Đang thả vào hũ...'
                    : `Thả Vào Hũ Điều Ước`}
                </span>
              </motion.button>

              <AnimatePresence>
                {wishSentToast && (
                  <motion.span
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs font-semibold text-[#2E7D5B] dark:text-[#7AD3A4] inline-flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Đã thả vào hũ &amp; gửi tới {settings.senderAlias || 'X'}!</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </form>

          {/* Right Column: Wishes Dropped Inside the Jar */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3
                className="text-base font-semibold text-[#4A3B3E] dark:text-[#F6EAEF] inline-flex items-center gap-1.5"
                style={{ fontFamily: 'var(--font-playfair), serif' }}
              >
                <StickyNote className="w-4 h-4 text-[#FF8FA3]" />
                <span>Những Điều Ước Đang Nằm Trong Hũ ({wishes.length})</span>
              </h3>
              <span className="text-xs text-[#7D6B6D] dark:text-[#C7B0B7]">
                Đồng bộ trực tiếp với sổ kế hoạch của {settings.senderAlias || 'X'}
              </span>
            </div>

            {wishes.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#FFFDF9] dark:bg-[#23191D]/85 border border-dashed border-[#F3D1DC] dark:border-[#533D45] text-center text-xs text-[#7D6B6D] dark:text-[#C7B0B7]">
                Hũ điều ước đang trống. {settings.herNickname} hãy thả điều ước đầu tiên ở khung bên trái nhé!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[380px] sm:max-h-[440px] overflow-y-auto pr-1">
                {wishes.map((wish, idx) => (
                  <motion.div
                    key={wish.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.04, 0.2) }}
                    className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between relative ${
                      idx % 2 === 0
                        ? 'bg-[#FFFDF9] dark:bg-[#241A1E] border-[#F3D1DC] dark:border-[#533D45]'
                        : 'bg-[#FFF7F9] dark:bg-[#2E2126] border-[#F7D6E0] dark:border-[#5D414B]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-[#7D6B6D] dark:text-[#C7B0B7] mb-2">
                        <span className="truncate">
                          <span className="tabular-nums">{wish.createdAt}</span>
                          {wish.category && (
                            <>
                              {' · '}
                              <span className="text-[#D95B72] dark:text-[#FF9EB0] font-medium">
                                {wish.category}
                              </span>
                            </>
                          )}
                        </span>
                        <span
                          className={`font-semibold shrink-0 ${
                            wish.fulfilledByThanh
                              ? 'text-[#2E7D5B] dark:text-[#7AD3A4]'
                              : 'text-[#D95B72] dark:text-[#FF9EB0]'
                          }`}
                        >
                          {wish.fulfilledByThanh
                            ? `✓ Đã thực hiện`
                            : `Đang ấp ủ`}
                        </span>
                      </div>

                      <h4
                        className="text-base font-semibold text-[#4A3B3E] dark:text-[#F6EAEF]"
                        style={{ fontFamily: 'var(--font-playfair), serif' }}
                      >
                        {wish.title}
                      </h4>
                      <p
                        className="text-xs text-[#6B5A5D] dark:text-[#D5C2C8] mt-1.5 leading-relaxed"
                        style={{
                          fontFamily:
                            'var(--font-handwriting), var(--font-jakarta), cursive, sans-serif',
                        }}
                      >
                        &ldquo;{wish.note}&rdquo;
                      </p>
                    </div>

                    {wish.thanhReply && (
                      <div className="mt-3.5 pt-3 border-t border-dashed border-[#F3D1DC] dark:border-[#533D45] bg-white/80 dark:bg-[#1E161A]/80 rounded-xl p-2.5 text-xs">
                        <div className="font-semibold text-[#D95B72] dark:text-[#FF9EB0] flex items-center gap-1 mb-0.5">
                          <MessageSquareHeart className="w-3.5 h-3.5 text-[#FF8FA3]" />
                          <span>
                            Lời nhắn lại từ {settings.senderAlias || 'X'}:
                          </span>
                        </div>
                        <p className="text-[#4A3B3E] dark:text-[#F6EAEF] italic">
                          &ldquo;{wish.thanhReply}&rdquo;
                        </p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Setup Panel strictly visible only to Admin role ('thanh') */}
      {userRole === 'thanh' && (
        <div
          id="setup-panel"
          className="bg-white dark:bg-[#271D21] rounded-3xl border border-[#F7D6E0] dark:border-[#4A363D] shadow-[0_14px_40px_rgba(255,143,163,0.12)] dark:shadow-[0_18px_48px_rgba(0,0,0,0.42)] p-4 sm:p-6 lg:p-10"
        >
          <div className="max-w-2xl mb-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#D95B72] dark:text-[#FF9EB0] mb-1">
              <Settings2 className="w-4 h-4 text-[#FF8FA3]" />
              <span>Bảng Cài Đặt Riêng (Chỉ hiển thị ở tài khoản Setup)</span>
            </div>
            <h3
              className="text-xl sm:text-2xl font-semibold text-[#4A3B3E] dark:text-[#F6EAEF]"
              style={{ fontFamily: 'var(--font-playfair), serif' }}
            >
              Tùy Chỉnh Không Gian Dành Cho {settings.herNickname}
            </h3>
            <p className="text-xs text-[#7D6B6D] dark:text-[#C7B0B7] mt-1">
              Mọi thay đổi ở đây sẽ cập nhật trực tiếp lên giao diện xem của Quỳnh Anh.
            </p>
          </div>

          <form
            onSubmit={handleSaveSettings}
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
          >
            <div>
              <label className="block text-xs font-medium text-[#4A3B3E] dark:text-[#F6EAEF] mb-1.5">
                Tên gọi hiển thị của bạn nữ
              </label>
              <input
                type="text"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                className="w-full px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FFFDF9] dark:bg-[#1E161A]/90 border border-[#F3D1DC] dark:border-[#533D45] text-base sm:text-sm text-[#4A3B3E] dark:text-[#F6EAEF] focus:outline-none focus:border-[#FF8FA3]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#4A3B3E] dark:text-[#F6EAEF] mb-1.5">
                Dòng chữ đề tặng ở cuối trang
              </label>
              <input
                type="text"
                value={headerNoteInput}
                onChange={(e) => setHeaderNoteInput(e.target.value)}
                className="w-full px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FFFDF9] dark:bg-[#1E161A]/90 border border-[#F3D1DC] dark:border-[#533D45] text-base sm:text-sm text-[#4A3B3E] dark:text-[#F6EAEF] focus:outline-none focus:border-[#FF8FA3]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[#4A3B3E] dark:text-[#F6EAEF] mb-1.5">
                Lời chào mở đầu dành tặng {settings.herNickname}
              </label>
              <textarea
                rows={3}
                value={welcomeInput}
                onChange={(e) => setWelcomeInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#FFFDF9] dark:bg-[#1E161A]/90 border border-[#F3D1DC] dark:border-[#533D45] text-base sm:text-sm text-[#4A3B3E] dark:text-[#F6EAEF] focus:outline-none focus:border-[#FF8FA3]"
              />
            </div>

            <div className="md:col-span-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FF8FA3] hover:bg-[#FF7A91] dark:bg-[#E06D82] dark:hover:bg-[#CE5D72] text-white text-xs font-medium shadow-[0_6px_18px_rgba(255,143,163,0.28)] transition-colors cursor-pointer"
              >
                <Feather className="w-3.5 h-3.5" />
                <span>Lưu Cài Đặt Giao Diện</span>
              </button>

              {settingsSavedToast && (
                <span className="text-xs text-[#3B875E] dark:text-[#7AD3A4] font-medium">
                  Đã cập nhật thành công cho giao diện của {settings.herNickname}!
                </span>
              )}
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
