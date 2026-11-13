'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CloudSun,
  Coffee,
  Droplets,
  ExternalLink,
  Flower2,
  Gamepad2,
  Grid,
  Heart,
  Music,
  RefreshCw,
  Smile,
  Sparkles,
  Star,
  Sun,
  X,
} from 'lucide-react';
import { playGentleGameChime, playPaperFlipSound } from '@/lib/data-service';
import type { ExternalGameItem } from '@/lib/types';

interface HealingMiniGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  herNickname: string;
  senderAlias: string;
  externalGames: ExternalGameItem[];
}

interface FloatingBubble {
  id: number;
  x: number;
  size: number;
  duration: number;
  color: string;
  isStar: boolean;
  note: string;
}

interface BurstEffect {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
}

const BUBBLE_COLORS = [
  '#FF8FA3',
  '#FFB3C1',
  '#FFD166',
  '#BDE0FE',
  '#CDB4DB',
  '#A8E6CF',
];

const POSITIVE_MICRO_NOTES = [
  'Nụ cười tỏa nắng nhé!',
  'Mọi mệt mỏi tan biến~',
  'Gửi cậu chút bình yên',
  'Hôm nay cậu tuyệt lắm!',
  'Thả lỏng đôi vai nhé',
  'Luôn có tớ cổ vũ cậu',
  'Thêm một điều may mắn!',
  'Giữ tâm trạng thật êm nha',
];

const FLOWER_BLOOM_WISHES = [
  'Bông hoa nhỏ đã nở rộ rồi! Chúc Quỳnh Anh luôn giữ được nét rạng rỡ, trong trẻo như ánh nắng ban mai nhé.',
  'Cảm ơn cậu đã dịu dàng chăm sóc chậu cây nhỏ. Mong mọi dự định sắp tới của Quỳnh Anh cũng đều nở hoa thật đẹp!',
  'Mỗi giọt nước và nụ cười cậu gửi vào đây đều hóa thành lời chúc bình yên mà tớ dành tặng riêng cho cậu.',
];

interface MemoryCardItem {
  uid: string;
  pairId: string;
  label: string;
  color: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const MEMORY_PAIRS = [
  { pairId: 'sun', label: 'Nắng Ấm', color: '#E09F24', Icon: Sun },
  { pairId: 'coffee', label: 'Trà Chiều', color: '#D95B72', Icon: Coffee },
  { pairId: 'heart', label: 'Dịu Dàng', color: '#FF6B88', Icon: Heart },
  { pairId: 'music', label: 'Giai Điệu', color: '#8B5CF6', Icon: Music },
  { pairId: 'cloud', label: 'Bình Yên', color: '#4A8BC2', Icon: CloudSun },
  { pairId: 'star', label: 'Lấp Lánh', color: '#F59E0B', Icon: Sparkles },
];

function createShuffledDeck(seed = 1): MemoryCardItem[] {
  const raw = [...MEMORY_PAIRS, ...MEMORY_PAIRS].map((item, idx) => ({
    uid: `card-${item.pairId}-${idx}-${seed}`,
    pairId: item.pairId,
    label: item.label,
    color: item.color,
    isFlipped: false,
    isMatched: false,
  }));
  for (let i = raw.length - 1; i > 0; i--) {
    const j = (i * 7 + seed * 13) % (i + 1);
    [raw[i], raw[j]] = [raw[j], raw[i]];
  }
  return raw;
}

export default function HealingMiniGameModal({
  isOpen,
  onClose,
  herNickname,
  senderAlias,
  externalGames,
}: HealingMiniGameModalProps) {
  const activeExternalGames = externalGames.filter((g) => g.isActive);
  const [selectedTab, setSelectedTab] = useState<string>('bubbles');

  // --- GAME 1: Bắt Sao Rơi & Đập Bong Bóng Tích Cực ---
  const [bubbles, setBubbles] = useState<FloatingBubble[]>([]);
  const [bursts, setBursts] = useState<BurstEffect[]>([]);
  const [bubbleScore, setBubbleScore] = useState<number>(0);
  const [latestNote, setLatestNote] = useState<string>(
    `Chạm nhẹ vào những quả bong bóng hoặc ngôi sao đang bay để giải tỏa căng thẳng nhé ${herNickname}!`
  );
  const bubbleSeqRef = useRef<number>(1);
  const burstSeqRef = useRef<number>(1);
  const deckSeedRef = useRef<number>(1);

  useEffect(() => {
    if (!isOpen || selectedTab !== 'bubbles') return;

    const spawnBubble = () => {
      bubbleSeqRef.current += 1;
      const id = bubbleSeqRef.current;
      const isStar = id % 4 === 0;
      const newBubble: FloatingBubble = {
        id,
        x: 10 + ((id * 19) % 76),
        size: isStar ? 46 : 48 + ((id * 11) % 24),
        duration: isStar ? 4.8 : 6.2 + ((id * 7) % 25) / 10,
        color: BUBBLE_COLORS[id % BUBBLE_COLORS.length],
        isStar,
        note: POSITIVE_MICRO_NOTES[id % POSITIVE_MICRO_NOTES.length],
      };
      setBubbles((prev) => [...prev.slice(-11), newBubble]);
    };

    spawnBubble();
    const timer = window.setInterval(spawnBubble, 900);
    return () => window.clearInterval(timer);
  }, [isOpen, selectedTab]);

  const handlePopBubble = (
    bubble: FloatingBubble,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.stopPropagation();
    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
    const clickX = rect ? e.clientX - rect.left : 150;
    const clickY = rect ? e.clientY - rect.top : 150;

    playGentleGameChime(bubble.isStar ? 783.99 : 587.33);
    setBubbles((prev) => prev.filter((b) => b.id !== bubble.id));
    setBubbleScore((prev) => prev + (bubble.isStar ? 3 : 1));
    setLatestNote(bubble.note);

    burstSeqRef.current += 1;
    const burstId = burstSeqRef.current;
    setBursts((prev) => [
      ...prev,
      {
        id: burstId,
        x: clickX,
        y: clickY,
        text: bubble.isStar ? '★ +3' : '+1',
        color: bubble.color,
      },
    ]);
    window.setTimeout(() => {
      setBursts((prev) => prev.filter((item) => item.id !== burstId));
    }, 850);
  };

  // --- GAME 2: Chăm Sóc Chậu Hoa Nhỏ ---
  const [flowerPoints, setFlowerPoints] = useState<number>(20);
  const [flowerWishIdx, setFlowerWishIdx] = useState<number>(0);
  const [flowerActionLabel, setFlowerActionLabel] = useState<string>(
    'Gửi chút nước mát, nắng ấm hoặc nụ cười để chậu hoa nhỏ lớn lên nhé!'
  );

  const flowerStage =
    flowerPoints >= 100
      ? 3
      : flowerPoints >= 65
        ? 2
        : flowerPoints >= 35
          ? 1
          : 0;

  const STAGE_NAMES = [
    'Hạt Mầm Nhỏ',
    'Chồi Non Xanh Mát',
    'Nụ Hồng Chớm Nở',
    'Hoa Nở Rạng Rỡ',
  ];

  const handleNurtureFlower = (
    delta: number,
    label: string,
    freq: number
  ) => {
    playGentleGameChime(freq);
    setFlowerActionLabel(label);
    setFlowerPoints((prev) => {
      const next = Math.min(100, prev + delta);
      if (next >= 100 && prev < 100) {
        setFlowerWishIdx((w) => (w + 1) % FLOWER_BLOOM_WISHES.length);
      }
      return next;
    });
  };

  const handleResetFlower = () => {
    playPaperFlipSound();
    setFlowerPoints(15);
    setFlowerWishIdx((w) => (w + 1) % FLOWER_BLOOM_WISHES.length);
    setFlowerActionLabel('Bắt đầu ươm một mầm hoa mới thật xinh nhé!');
  };

  // --- GAME 3: Lật Thẻ Bài Tìm Cặp Chữa Lành ---
  const [cards, setCards] = useState<MemoryCardItem[]>(() =>
    createShuffledDeck(1)
  );
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [movesCount, setMovesCount] = useState<number>(0);
  const lockBoardRef = useRef<boolean>(false);

  const matchedCount = cards.filter((c) => c.isMatched).length / 2;

  const handleCardClick = (index: number) => {
    if (lockBoardRef.current) return;
    const target = cards[index];
    if (!target || target.isFlipped || target.isMatched) return;

    playGentleGameChime(523.25);
    const nextCards = cards.map((c, idx) =>
      idx === index ? { ...c, isFlipped: true } : c
    );
    setCards(nextCards);

    const nextFlipped = [...flippedIndices, index];
    setFlippedIndices(nextFlipped);

    if (nextFlipped.length === 2) {
      setMovesCount((m) => m + 1);
      const [firstIdx, secondIdx] = nextFlipped;
      const firstCard = nextCards[firstIdx];
      const secondCard = nextCards[secondIdx];

      if (firstCard.pairId === secondCard.pairId) {
        playGentleGameChime(698.46);
        setCards((prev) =>
          prev.map((c, idx) =>
            idx === firstIdx || idx === secondIdx
              ? { ...c, isMatched: true }
              : c
          )
        );
        setFlippedIndices([]);
      } else {
        lockBoardRef.current = true;
        window.setTimeout(() => {
          setCards((prev) =>
            prev.map((c, idx) =>
              idx === firstIdx || idx === secondIdx
                ? { ...c, isFlipped: false }
                : c
            )
          );
          setFlippedIndices([]);
          lockBoardRef.current = false;
        }, 700);
      }
    }
  };

  const handleRestartMemory = () => {
    playPaperFlipSound();
    lockBoardRef.current = false;
    setFlippedIndices([]);
    setMovesCount(0);
    deckSeedRef.current += 1;
    setCards(createShuffledDeck(deckSeedRef.current));
  };

  // --- External Game iframe key for reload ---
  const [iframeReloadKey, setIframeReloadKey] = useState<number>(0);
  const activeExternalGame = activeExternalGames.find(
    (g) => g.id === selectedTab
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-[#3A2B2E]/55 dark:bg-[#120C0E]/72 backdrop-blur-md flex items-start sm:items-center justify-center p-2.5 sm:p-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-[calc(0.75rem+env(safe-area-inset-bottom))] overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 14 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="my-auto w-full max-w-2xl bg-[#FFFDF9]/92 dark:bg-[#271D21]/92 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-[#F7D6E0] dark:border-[#533D45] shadow-[0_24px_70px_rgba(74,59,62,0.28)] dark:shadow-[0_28px_80px_rgba(0,0,0,0.65)] overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88dvh]"
        >
          {/* Compact Cozy Header */}
          <div className="px-4 sm:px-5 py-3.5 sm:py-4 bg-gradient-to-r from-[#FFF0F3]/90 via-[#FFF8FA]/90 to-[#FFF0F3]/90 dark:from-[#36282E]/95 dark:via-[#2C2025]/95 dark:to-[#36282E]/95 border-b border-[#F7D6E0] dark:border-[#4F3941] flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-white dark:bg-[#3A2930] border border-[#FFCCD5] dark:border-[#6A4A56] flex items-center justify-center text-[#FF8FA3] shadow-2xs shrink-0">
                <Gamepad2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3
                  className="text-sm sm:text-base font-semibold text-[#4A3B3E] dark:text-[#F6EAEF] truncate"
                  style={{ fontFamily: 'var(--font-playfair), serif' }}
                >
                  Góc Nhỏ Giải Khuây · Dành Tặng {herNickname}
                </h3>
                <p className="text-[11px] text-[#7D6B6D] dark:text-[#C7B0B7] truncate">
                  Thư giãn nhẹ nhàng · Không áp lực thời gian
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng góc giải khuây"
              className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 rounded-xl bg-white/90 dark:bg-[#36282E] hover:bg-white dark:hover:bg-[#49323B] text-[#7D6B6D] dark:text-[#C7B0B7] hover:text-[#4A3B3E] dark:hover:text-[#F6EAEF] border border-[#F3D1DC] dark:border-[#533D45] transition-colors cursor-pointer inline-flex items-center justify-center shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Subtle Game Switcher Bar */}
          <div className="px-4 sm:px-5 py-2.5 bg-white dark:bg-[#23191D] border-b border-[#F7E4EA] dark:border-[#4A363D] flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => {
                playPaperFlipSound();
                setSelectedTab('bubbles');
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                selectedTab === 'bubbles'
                  ? 'bg-[#FF8FA3] dark:bg-[#E06D82] text-white shadow-2xs'
                  : 'bg-[#FFFDF9] dark:bg-[#2E2227] text-[#7D6B6D] dark:text-[#C7B0B7] hover:text-[#4A3B3E] dark:hover:text-[#F6EAEF] border border-[#F3D1DC] dark:border-[#533D45]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bong Bóng &amp; Sao</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playPaperFlipSound();
                setSelectedTab('flower');
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                selectedTab === 'flower'
                  ? 'bg-[#FF8FA3] dark:bg-[#E06D82] text-white shadow-2xs'
                  : 'bg-[#FFFDF9] dark:bg-[#2E2227] text-[#7D6B6D] dark:text-[#C7B0B7] hover:text-[#4A3B3E] dark:hover:text-[#F6EAEF] border border-[#F3D1DC] dark:border-[#533D45]'
              }`}
            >
              <Flower2 className="w-3.5 h-3.5" />
              <span>Chậu Hoa Nhỏ</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playPaperFlipSound();
                setSelectedTab('memory');
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                selectedTab === 'memory'
                  ? 'bg-[#FF8FA3] dark:bg-[#E06D82] text-white shadow-2xs'
                  : 'bg-[#FFFDF9] dark:bg-[#2E2227] text-[#7D6B6D] dark:text-[#C7B0B7] hover:text-[#4A3B3E] dark:hover:text-[#F6EAEF] border border-[#F3D1DC] dark:border-[#533D45]'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Ghép Thẻ Dịu Êm</span>
            </button>

            {activeExternalGames.map((ext) => (
              <button
                key={ext.id}
                type="button"
                onClick={() => {
                  playPaperFlipSound();
                  setSelectedTab(ext.id);
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedTab === ext.id
                    ? 'bg-[#FF8FA3] dark:bg-[#E06D82] text-white shadow-2xs'
                    : 'bg-[#FFFDF9] dark:bg-[#2E2227] text-[#7D6B6D] dark:text-[#C7B0B7] hover:text-[#4A3B3E] dark:hover:text-[#F6EAEF] border border-[#F3D1DC] dark:border-[#533D45]'
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>{ext.title}</span>
              </button>
            ))}
          </div>

          {/* Game Stage Area */}
          <div className="p-4 sm:p-5 overflow-y-auto flex-1">
            {/* TAB 1: BONG BÓNG & SAO RƠI */}
            {selectedTab === 'bubbles' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 px-1">
                  <p className="min-w-0 text-xs font-medium text-[#D95B72] dark:text-[#FF9EB0] italic truncate">
                    &ldquo;{latestNote}&rdquo;
                  </p>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF0F3] dark:bg-[#3A2930] border border-[#FFCCD5] dark:border-[#6A4A56] text-xs font-semibold text-[#D95B72] dark:text-[#FF9EB0] shrink-0 tabular-nums">
                    <Star className="w-3.5 h-3.5 text-[#FF8FA3] fill-[#FF8FA3]" />
                    <span>{bubbleScore} điểm vui</span>
                  </div>
                </div>

                <div className="relative w-full h-[230px] sm:h-[300px] md:h-[320px] rounded-2xl bg-gradient-to-b from-[#FFF5F7] via-[#FFFDF9] to-[#FFF0F3] dark:from-[#23191D] dark:via-[#1E161A] dark:to-[#2C1F25] border border-[#F3D1DC] dark:border-[#533D45] overflow-hidden select-none shadow-inner">
                  {/* Ambient background clouds */}
                  <div className="pointer-events-none absolute top-4 left-6 opacity-30">
                    <CloudSun className="w-12 h-12 text-[#FFB3C1]" />
                  </div>
                  <div className="pointer-events-none absolute bottom-4 right-6 opacity-25">
                    <Sparkles className="w-10 h-10 text-[#FFD166]" />
                  </div>

                  {/* Floating Bubbles & Stars */}
                  <AnimatePresence>
                    {bubbles.map((b) => (
                      <motion.button
                        key={b.id}
                        type="button"
                        initial={{ y: 330, opacity: 0, scale: 0.7 }}
                        animate={{ y: -70, opacity: 0.95, scale: 1 }}
                        exit={{ scale: 1.35, opacity: 0 }}
                        transition={{
                          y: { duration: b.duration, ease: 'linear' },
                          opacity: { duration: 0.25 },
                        }}
                        onAnimationComplete={() =>
                          setBubbles((prev) =>
                            prev.filter((item) => item.id !== b.id)
                          )
                        }
                        onClick={(e) => handlePopBubble(b, e)}
                        style={{
                          left: `${b.x}%`,
                          width: `${b.size}px`,
                          height: `${b.size}px`,
                          backgroundColor: b.isStar
                            ? '#FFFDF0'
                            : `${b.color}30`,
                          borderColor: b.color,
                        }}
                        className="absolute rounded-full border-2 flex items-center justify-center shadow-[0_6px_18px_rgba(255,143,163,0.2)] cursor-pointer active:scale-90"
                      >
                        {b.isStar ? (
                          <Star
                            className="w-6 h-6 fill-[#FFD166] text-[#F59E0B]"
                          />
                        ) : (
                          <span
                            style={{ backgroundColor: b.color }}
                            className="w-2.5 h-2.5 rounded-full opacity-70"
                          />
                        )}
                      </motion.button>
                    ))}
                  </AnimatePresence>

                  {/* Popped particle bursts */}
                  <AnimatePresence>
                    {bursts.map((burst) => (
                      <motion.div
                        key={burst.id}
                        initial={{ opacity: 1, y: 0, scale: 0.8 }}
                        animate={{ opacity: 0, y: -28, scale: 1.15 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                        style={{
                          left: burst.x,
                          top: burst.y,
                          color: burst.color,
                        }}
                        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-xs font-bold whitespace-nowrap"
                      >
                        {burst.text}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* TAB 2: CHẬU HOA NHỎ NỞ LỜI CHÚC */}
            {selectedTab === 'flower' && (
              <div className="space-y-5 text-center py-2">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFF0F3] dark:bg-[#3A2930] border border-[#FFCCD5] dark:border-[#6A4A56] text-xs font-semibold text-[#D95B72] dark:text-[#FF9EB0]">
                  <Flower2 className="w-3.5 h-3.5 text-[#FF8FA3]" />
                  <span>
                    {STAGE_NAMES[flowerStage]} · {flowerPoints}%
                  </span>
                </div>

                {/* Flower visual pot */}
                <div className="relative mx-auto w-40 h-40 sm:w-52 sm:h-52 rounded-full bg-gradient-to-b from-[#FFF5F7] to-[#FFFDF9] dark:from-[#36282E] dark:to-[#22191D] border border-[#F3D1DC] dark:border-[#533D45] flex flex-col items-center justify-center shadow-xs">
                  <motion.div
                    key={flowerStage}
                    initial={{ scale: 0.75, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 16 }}
                    className="flex flex-col items-center"
                  >
                    {flowerStage === 0 && (
                      <div className="w-14 h-14 rounded-full bg-[#E8F8EE] dark:bg-[#1E352A] border border-[#BDE8CB] dark:border-[#396750] flex items-center justify-center text-[#2E7D5B] dark:text-[#7AD3A4]">
                        <Sparkles className="w-6 h-6" />
                      </div>
                    )}
                    {flowerStage === 1 && (
                      <div className="w-16 h-16 rounded-full bg-[#E8F8EE] dark:bg-[#1E352A] border border-[#BDE8CB] dark:border-[#396750] flex items-center justify-center text-[#2E7D5B] dark:text-[#7AD3A4]">
                        <Flower2 className="w-8 h-8" />
                      </div>
                    )}
                    {flowerStage === 2 && (
                      <div className="w-20 h-20 rounded-full bg-[#FFF0F3] dark:bg-[#3F2B33] border border-[#FFCCD5] dark:border-[#6A4A56] flex items-center justify-center text-[#FF8FA3]">
                        <Flower2 className="w-11 h-11" />
                      </div>
                    )}
                    {flowerStage === 3 && (
                      <motion.div
                        initial={{ scale: 0.85, rotate: -6 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 14 }}
                        className="w-24 h-24 rounded-full bg-[#FFF0F3] dark:bg-[#3F2B33] border-2 border-[#FF8FA3] dark:border-[#E06D82] flex items-center justify-center text-[#D95B72] dark:text-[#FF9EB0] shadow-[0_8px_24px_rgba(255,143,163,0.3)]"
                      >
                        <Flower2 className="w-14 h-14 fill-[#FFB3C1]/40" />
                      </motion.div>
                    )}

                    {/* Terracotta Pot base */}
                    <div className="mt-2 w-20 h-10 bg-[#E6A498] dark:bg-[#A6685E] border-2 border-[#D1887B] dark:border-[#854E45] rounded-b-2xl rounded-t-md shadow-2xs" />
                  </motion.div>
                </div>

                {/* Progress bar */}
                <div className="max-w-xs mx-auto w-full h-2.5 rounded-full bg-[#F7E4EA] dark:bg-[#3D2830] overflow-hidden">
                  <motion.div
                    animate={{ width: `${flowerPoints}%` }}
                    className="h-full bg-gradient-to-r from-[#FFB3C1] to-[#FF8FA3] dark:from-[#E06D82] dark:to-[#FF9EB0] rounded-full"
                  />
                </div>

                {/* Blooming wish message */}
                <div className="max-w-md mx-auto p-4 rounded-2xl bg-white/95 dark:bg-[#2E2227]/90 border border-[#F3D1DC] dark:border-[#533D45] shadow-2xs">
                  <p
                    className="text-sm italic text-[#4A3B3E] dark:text-[#F6EAEF] leading-relaxed"
                    style={{ fontFamily: 'var(--font-playfair), serif' }}
                  >
                    &ldquo;
                    {flowerStage === 3
                      ? FLOWER_BLOOM_WISHES[flowerWishIdx]
                      : flowerActionLabel}
                    &rdquo;
                  </p>
                </div>

                {/* Nurture Buttons */}
                <div className="flex items-center justify-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() =>
                      handleNurtureFlower(
                        20,
                        'Đã tưới thêm những giọt nước mát lành!',
                        523.25
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] sm:min-h-0 rounded-xl bg-[#EAF4FF] dark:bg-[#1E2E3D] hover:bg-[#D8ECFF] dark:hover:bg-[#263B4E] text-[#3B76AD] dark:text-[#86C1F7] border border-[#BDE0FE] dark:border-[#395B7A] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Droplets className="w-3.5 h-3.5" />
                    <span>Tưới Nước</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleNurtureFlower(
                        20,
                        'Nắng ấm dịu dàng đang chiếu lên mầm cây!',
                        659.25
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FFF8E1] dark:bg-[#3A2E1A] hover:bg-[#FFECB3] dark:hover:bg-[#493A21] text-[#C88719] dark:text-[#F4CB73] border border-[#FFE08A] dark:border-[#6A542C] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Đón Nắng</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleNurtureFlower(
                        25,
                        `Nụ cười của ${herNickname} làm hoa lớn nhanh hơn hẳn!`,
                        783.99
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FFF0F3] dark:bg-[#3A2930] hover:bg-[#FFE5EC] dark:hover:bg-[#49323B] text-[#D95B72] dark:text-[#FF9EB0] border border-[#FFCCD5] dark:border-[#6A4A56] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Smile className="w-3.5 h-3.5" />
                    <span>Gửi Nụ Cười</span>
                  </button>

                  {flowerStage === 3 && (
                    <button
                      type="button"
                      onClick={handleResetFlower}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] sm:min-h-0 rounded-xl bg-white dark:bg-[#2E2227] hover:bg-[#FFFDF9] dark:hover:bg-[#3A2930] text-[#7D6B6D] dark:text-[#C7B0B7] border border-[#F3D1DC] dark:border-[#533D45] text-xs font-medium cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Ươm hoa mới</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: GHÉP THẺ DỊU ÊM (MEMORY MATCH) */}
            {selectedTab === 'memory' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 px-1">
                  <span className="text-xs text-[#7D6B6D] dark:text-[#C7B0B7]">
                    Đã tìm thấy:{' '}
                    <strong className="text-[#D95B72] dark:text-[#FF9EB0] tabular-nums">
                      {matchedCount}/6 cặp
                    </strong>{' '}
                    · Lượt lật:{' '}
                    <span className="tabular-nums">{movesCount}</span>
                  </span>

                  <button
                    type="button"
                    onClick={handleRestartMemory}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-1 min-h-[40px] sm:min-h-0 rounded-xl bg-[#FFF0F3] dark:bg-[#3A2930] hover:bg-[#FFE5EC] dark:hover:bg-[#49323B] text-[#D95B72] dark:text-[#FF9EB0] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Xếp lại thẻ</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                  {cards.map((card, idx) => {
                    const pairMeta =
                      MEMORY_PAIRS.find((p) => p.pairId === card.pairId) ||
                      MEMORY_PAIRS[0];
                    const PairIcon = pairMeta.Icon;
                    const revealed = card.isFlipped || card.isMatched;

                    return (
                      <motion.button
                        key={card.uid}
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleCardClick(idx)}
                        className={`h-[72px] sm:h-24 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                          card.isMatched
                            ? 'bg-[#FFF0F3] dark:bg-[#49323B] border-[#FF8FA3] dark:border-[#E06D82] shadow-2xs'
                            : revealed
                              ? 'bg-white dark:bg-[#36282E] border-[#FFB3C1] dark:border-[#6A4A56] shadow-xs'
                              : 'bg-gradient-to-br from-[#FFF5F7] to-[#FFE5EC]/60 dark:from-[#312429] dark:to-[#271D21] border-[#F3D1DC] dark:border-[#533D45] hover:border-[#FFB3C1] dark:hover:border-[#6A4A56]'
                        }`}
                      >
                        {revealed ? (
                          <>
                            <PairIcon
                              style={{ color: card.color }}
                              className="w-6 h-6"
                            />
                            <span className="text-[11px] font-semibold text-[#4A3B3E] dark:text-[#F6EAEF]">
                              {card.label}
                            </span>
                          </>
                        ) : (
                          <Heart className="w-4 h-4 text-[#FFB3C1] dark:text-[#E06D82] fill-[#FFB3C1]/40" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {matchedCount === 6 && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-2xl bg-[#FFF0F3] dark:bg-[#3A2930] border border-[#FFCCD5] dark:border-[#6A4A56] text-center text-xs text-[#D95B72] dark:text-[#FF9EB0] font-medium"
                  >
                    Tuyệt vời quá {herNickname} ơi! Cậu đã ghép đủ cả 6 cặp biểu
                    tượng bình yên rồi. Chúc cậu phần còn lại của ngày hôm nay
                    thật nhẹ nhàng nhé!
                  </motion.div>
                )}
              </div>
            )}

            {/* EXTERNAL EMBEDDED GAME TABS (Added by Admin) */}
            {activeExternalGame && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h4 className="text-xs font-bold text-[#4A3B3E] dark:text-[#F6EAEF]">
                      {activeExternalGame.title}
                    </h4>
                    <p className="text-[11px] text-[#7D6B6D] dark:text-[#C7B0B7]">
                      {activeExternalGame.moodNote ||
                        `Trò chơi nhỏ ${senderAlias} chọn riêng cho ${herNickname}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIframeReloadKey((k) => k + 1)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 sm:py-1 min-h-[40px] sm:min-h-0 rounded-lg bg-[#FFF0F3] dark:bg-[#3A2930] text-[#D95B72] dark:text-[#FF9EB0] text-[11px] font-semibold border border-[#FFCCD5] dark:border-[#6A4A56] cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Tải lại</span>
                    </button>
                    <a
                      href={activeExternalGame.embedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 sm:py-1 min-h-[40px] sm:min-h-0 rounded-lg bg-white dark:bg-[#2E2227] text-[#7D6B6D] dark:text-[#C7B0B7] hover:text-[#4A3B3E] dark:hover:text-[#F6EAEF] text-[11px] font-medium border border-[#F3D1DC] dark:border-[#533D45]"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Mở rộng</span>
                    </a>
                  </div>
                </div>

                <div className="w-full h-[min(360px,52dvh)] sm:h-[400px] rounded-2xl overflow-hidden border border-[#F3D1DC] dark:border-[#533D45] bg-[#FAF7F2] dark:bg-[#1E161A]">
                  <iframe
                    key={`${activeExternalGame.id}-${iframeReloadKey}`}
                    src={activeExternalGame.embedUrl}
                    title={activeExternalGame.title}
                    className="w-full h-full border-0"
                    allow="autoplay; fullscreen; gamepad"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
