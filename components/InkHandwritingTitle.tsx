'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Feather, Sparkles, RotateCcw } from 'lucide-react';

interface InkHandwritingTitleProps {
  herNickname: string;
  senderAlias: string;
  replaySignal?: number;
}

const CALLIGRAPHY_TITLE = 'Góc Nhỏ Chữa Lành';

export default function InkHandwritingTitle({
  herNickname,
  senderAlias,
  replaySignal = 0,
}: InkHandwritingTitleProps) {
  const [manualReplay, setManualReplay] = useState(0);
  const [viewportReplay, setViewportReplay] = useState(0);

  const animationKey = `${replaySignal}-${manualReplay}-${viewportReplay}`;
  const characters = Array.from(CALLIGRAPHY_TITLE);

  return (
    <motion.div
      onViewportEnter={() => setViewportReplay((prev) => prev + 1)}
      viewport={{ once: true, amount: 0.35 }}
      className="relative"
    >
      {/* Top Calligraphic Ink Title Line ("Góc Nhỏ Chữa Lành") */}
      <div className="mb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
          <span className="text-[11px] font-medium text-[#7D6B6D] dark:text-[#C7B0B7] inline-flex items-center gap-1.5">
            <Feather className="w-3.5 h-3.5 text-[#D95B72] dark:text-[#FF9EB0]" />
            <span>Nét bút viết tay từ {senderAlias} dành riêng cho {herNickname}</span>
          </span>

          <button
            type="button"
            onClick={() => setManualReplay((prev) => prev + 1)}
            title="Xem lại hiệu ứng viết chữ bằng mực"
            className="min-h-[38px] sm:min-h-0 inline-flex items-center gap-1 px-3 py-1.5 sm:py-1 rounded-full bg-[#FFF0F3] dark:bg-[#3A2930]/90 hover:bg-[#FFE5EC] dark:hover:bg-[#49343C] border border-[#F3D1DC] dark:border-[#5E434D] text-[11px] font-medium text-[#D95B72] dark:text-[#FF9EB0] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Viết lại nét mực</span>
          </button>
        </div>

        {/* Character-by-character Ink Reveal + Gliding Feather Quill */}
        <div
          key={`ink-box-${animationKey}`}
          className="relative inline-block max-w-full py-1 pr-6 sm:pr-9 overflow-hidden"
        >
          <div
            aria-label={CALLIGRAPHY_TITLE}
            className="text-2xl sm:text-3xl font-bold tracking-tight text-[#D95B72] dark:text-[#FF9EB0] inline-flex flex-wrap items-baseline"
            style={{
              fontFamily:
                'var(--font-handwriting), var(--font-playfair), cursive',
            }}
          >
            {characters.map((char, index) => (
              <motion.span
                key={`char-${index}`}
                initial={{
                  opacity: 0,
                  y: 5,
                  scale: 0.88,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                transition={{
                  duration: 0.2,
                  delay: index * 0.055,
                  ease: 'easeOut',
                }}
                className={char === ' ' ? 'inline-block w-2' : 'inline-block'}
              >
                {char}
              </motion.span>
            ))}
          </div>

          {/* Animated Feather Pen Nib gliding via GPU transform along the text */}
          <motion.div
            initial={{ x: 0, y: 4, opacity: 0, rotate: -15 }}
            animate={{
              x: [0, 195, 225],
              y: [4, -2, 5],
              opacity: [0, 1, 1, 0],
              rotate: [-15, -26, -12, -22, -12],
            }}
            transition={{
              duration: characters.length * 0.055 + 0.3,
              ease: 'easeInOut',
            }}
            className="pointer-events-none absolute top-1 left-0 z-20 flex items-center"
          >
            <div className="relative">
              <Feather className="w-6 h-6 text-[#D95B72] fill-[#FFE5EC]" />
              <Sparkles className="w-3 h-3 text-[#FFD166] fill-[#FFD166] absolute -bottom-1 -left-1" />
            </div>
          </motion.div>

          {/* Animated SVG Ink Flourish Underline */}
          <svg
            viewBox="0 0 320 18"
            fill="none"
            className="w-full max-w-[290px] h-4 mt-0.5 overflow-visible"
            aria-hidden="true"
          >
            <motion.path
              d="M4 11 C 78 2, 165 17, 255 7 C 282 4, 304 8, 314 6"
              stroke="url(#inkGradient)"
              strokeWidth="2.4"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                duration: 0.95,
                delay: characters.length * 0.055,
                ease: 'easeOut',
              }}
            />
            <defs>
              <linearGradient id="inkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#D95B72" />
                <stop offset="60%" stopColor="#FF8FA3" />
                <stop offset="100%" stopColor="#FFD166" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Main Editorial Headline with Gentle Ink-Wash Reveal */}
      <motion.h1
        key={`sub-headline-${animationKey}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.55,
          delay: 0.45,
          ease: 'easeOut',
        }}
        className="text-2xl min-[380px]:text-3xl sm:text-5xl font-semibold text-[#4A3B3E] dark:text-[#F6EAEF] leading-[1.2] tracking-tight"
        style={{
          fontFamily: 'var(--font-playfair), serif',
          textWrap: 'balance',
        }}
      >
        Nơi Lưu Giữ Những Khoảnh Khắc Rạng Rỡ Của{' '}
        <span className="text-[#D95B72] dark:text-[#FF9EB0] underline decoration-[#FFB3C1] dark:decoration-[#FF9EB0]/70 decoration-wavy decoration-2 underline-offset-8">
          {herNickname}
        </span>
      </motion.h1>
    </motion.div>
  );
}
