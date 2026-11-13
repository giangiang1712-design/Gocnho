'use client';

import React, { useState } from 'react';
import {
  motion,
  AnimatePresence,
  type PanInfo,
} from 'motion/react';
import {
  BookOpen,
  Bookmark,
  Camera,
  ChevronLeft,
  ChevronRight,
  Feather,
  Gift,
  Heart,
  MoveHorizontal,
  Sparkles,
} from 'lucide-react';

export interface ScrapbookTabItem {
  index: number;
  pageNumber: string;
  shortLabel: string;
  title: string;
}

interface ScrapbookPageSectionProps {
  id: string;
  pageNumber: string;
  totalPages?: string;
  chapterTitle: string;
  chapterSubtitle: string;
  flipDirection?: number;
  onFlipPrev?: () => void;
  onFlipNext?: () => void;
  prevPageLabel?: string;
  nextPageLabel?: string;
  activePageIndex?: number;
  onSelectPageIndex?: (idx: number) => void;
  tabs?: ScrapbookTabItem[];
  children: React.ReactNode;
}

export default function ScrapbookPageSection({
  id,
  pageNumber,
  totalPages = '03',
  chapterTitle,
  chapterSubtitle,
  flipDirection = 1,
  onFlipPrev,
  onFlipNext,
  prevPageLabel,
  nextPageLabel,
  activePageIndex = 0,
  onSelectPageIndex,
  tabs = [],
  children,
}: ScrapbookPageSectionProps) {
  const [isCornerHovered, setIsCornerHovered] = useState(false);

  const handleFooterPanEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if ((info.offset.x < -65 || info.velocity.x < -360) && onFlipNext) {
      onFlipNext();
    } else if ((info.offset.x > 65 || info.velocity.x > 360) && onFlipPrev) {
      onFlipPrev();
    }
  };

  return (
    <div id={id} className="relative w-full">
      {/* Multi-Layer Hardcover & Stacked Paper Sheets Behind Active Page */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-1 sm:-inset-x-1.5 -inset-y-1.5 rounded-[36px] bg-gradient-to-br from-[#F7D6E0] via-[#FFE5EC] to-[#F3C6D3] dark:from-[#36252B] dark:via-[#2B1D22] dark:to-[#3E2B32] shadow-[0_24px_60px_rgba(74,59,62,0.14)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.48)] -z-30 transition-colors duration-500"
      />
      <div
        aria-hidden="true"
        className="hidden sm:block pointer-events-none absolute top-3 bottom-3 -right-2 w-6 rounded-r-[32px] bg-[#FFF8F4] dark:bg-[#2F2227] border-y border-r border-[#F3D1DC] dark:border-[#4D373F] shadow-xs -z-20 transition-colors duration-500"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-2 -bottom-2.5 h-7 rounded-b-[32px] bg-[#FFF8F4] dark:bg-[#2F2227] border border-[#F3D1DC] dark:border-[#4D373F] shadow-xs -z-20 transition-colors duration-500"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-5 -bottom-4.5 h-7 rounded-b-[32px] bg-[#FFF0F3]/90 dark:bg-[#261B1F]/95 border border-[#F3D1DC]/75 dark:border-[#433037] -z-20 transition-colors duration-500"
      />

      {/* Right-Edge Sticking Bookmark Index Tabs (Desktop) */}
      {tabs.length > 0 && onSelectPageIndex && (
        <div className="hidden xl:flex flex-col gap-2.5 absolute -right-11 top-14 z-30">
          {tabs.map((tab) => {
            const isCurrent = tab.index === activePageIndex;
            const TabIcon =
              tab.index === 0 ? Feather : tab.index === 1 ? Camera : Gift;
            return (
              <motion.button
                key={tab.index}
                type="button"
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onSelectPageIndex(tab.index)}
                title={tab.title}
                className={`group flex items-center gap-1.5 pl-3 pr-3.5 py-2.5 rounded-r-2xl border border-l-0 text-xs font-semibold shadow-sm transition-colors cursor-pointer ${
                  isCurrent
                    ? 'bg-[#FF8FA3] dark:bg-[#E06D82] text-white border-[#FF8FA3] dark:border-[#E06D82] translate-x-1 shadow-[4px_4px_14px_rgba(255,143,163,0.35)]'
                    : 'bg-[#FFFDF9] dark:bg-[#2F2227] text-[#7D6B6D] dark:text-[#C7B0B7] hover:text-[#4A3B3E] dark:hover:text-[#FFF0F3] border-[#F3D1DC] dark:border-[#4D373F] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2A30]'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="tabular-nums">{tab.pageNumber}</span>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Lightweight GPU Slide + Fade Book Sheet Transition */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`book-page-${pageNumber}`}
          initial={{
            opacity: 0,
            x: flipDirection >= 0 ? 32 : -32,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          exit={{
            opacity: 0,
            x: flipDirection >= 0 ? -24 : 24,
          }}
          transition={{
            duration: 0.24,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="relative bg-[#FFFDF9] dark:bg-[#271D21] rounded-[26px] sm:rounded-[32px] border border-[#F5D5E0] dark:border-[#4A363D] shadow-[0_20px_55px_rgba(255,143,163,0.16)] dark:shadow-[0_22px_60px_rgba(0,0,0,0.45)] p-4 sm:p-8 lg:p-10 lg:pl-16 overflow-hidden transition-colors duration-500"
        >
          {/* Subtle Left Spine Inner Shadow for Authentic Open-Book Curvature */}
          <div
            aria-hidden="true"
            className="pointer-events-none hidden lg:block absolute left-10 top-0 bottom-0 w-10 bg-gradient-to-r from-[#4A3B3E]/[0.05] dark:from-black/30 via-[#FF8FA3]/[0.03] to-transparent z-10"
          />

          {/* Left Notebook Spine & Rose-Gold Spiral Rings */}
          <div
            aria-hidden="true"
            className="hidden lg:flex flex-col justify-between items-center absolute left-0 top-0 bottom-0 w-11 py-9 bg-gradient-to-r from-[#FFF0F3] via-[#FFF7F9] to-[#FFFDF9] dark:from-[#20171A] dark:via-[#241A1E] dark:to-[#271D21] border-r border-dashed border-[#F3D1DC] dark:border-[#4A363D] z-20 transition-colors duration-500"
          >
            {[0, 1, 2, 3, 4, 5, 6, 7].map((ringIdx) => (
              <div key={ringIdx} className="relative flex items-center">
                <span className="w-3.5 h-3.5 rounded-full bg-[#F9E5EC] dark:bg-[#191215] border border-[#E2B4C1] dark:border-[#5C434B] shadow-inner block" />
                <span className="w-5 h-2 -ml-6 rounded-full bg-gradient-to-r from-[#D97F91] via-[#FFB3C1] to-[#E5989B] dark:from-[#9F5566] dark:via-[#D98296] dark:to-[#B56978] border border-white/60 dark:border-[#F6EAEF]/25 shadow-xs block" />
              </div>
            ))}
          </div>

          {/* Top Scrapbook Page Header Bar */}
          <div className="relative z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-5 mb-5 sm:mb-7 border-b border-dashed border-[#F3D1DC] dark:border-[#4A363D]">
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap min-w-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF0F3] dark:bg-[#3A2930] border border-[#FFCCD5] dark:border-[#5D414B] text-xs font-semibold text-[#D95B72] dark:text-[#FF9EB0] shadow-2xs shrink-0">
                <BookOpen className="w-3.5 h-3.5 text-[#FF8FA3] dark:text-[#FF9EB0]" />
                <span className="tabular-nums">
                  Trang {pageNumber} / {totalPages}
                </span>
                <Sparkles className="w-3 h-3 text-[#F4B860]" />
              </span>

              <span
                className="text-sm sm:text-base font-semibold text-[#4A3B3E] dark:text-[#F6EAEF]"
                style={{ fontFamily: 'var(--font-playfair), serif' }}
              >
                {chapterTitle}
              </span>
              <span className="hidden md:inline text-xs text-[#B39EA1] dark:text-[#8F767E]">
                ·
              </span>
              <span className="hidden md:inline text-xs text-[#7D6B6D] dark:text-[#C7B0B7] italic">
                {chapterSubtitle}
              </span>
            </div>

            {/* Interactive Page Pill Switcher in Header */}
            <div className="flex items-center gap-1 sm:gap-1.5 bg-[#FFF0F3] dark:bg-[#20171B] p-1 rounded-full border border-[#F3D1DC] dark:border-[#4A363D] overflow-x-auto no-scrollbar w-full sm:w-auto shrink-0">
              {tabs.map((tab) => {
                const active = tab.index === activePageIndex;
                return (
                  <button
                    key={tab.index}
                    type="button"
                    onClick={() =>
                      onSelectPageIndex && onSelectPageIndex(tab.index)
                    }
                    className={`relative flex-1 sm:flex-initial min-h-[38px] sm:min-h-0 px-3 py-1.5 sm:py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 text-center ${
                      active
                        ? 'text-white'
                        : 'text-[#7D6B6D] dark:text-[#C7B0B7] hover:text-[#4A3B3E] dark:hover:text-[#FFF0F3]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="scrapbookActivePagePill"
                        transition={{
                          type: 'spring',
                          stiffness: 420,
                          damping: 32,
                        }}
                        className="absolute inset-0 rounded-full bg-[#FF8FA3] dark:bg-[#E06D82] shadow-2xs -z-10"
                      />
                    )}
                    <span className="relative z-10">{tab.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Scrapbook Page Content */}
          <div className="relative z-10">{children}</div>

          {/* Bottom Page-Flip Bar with Horizontal Swipe Gesture Support */}
          <motion.div
            onPanEnd={handleFooterPanEnd}
            className="relative z-20 mt-8 sm:mt-10 pt-5 border-t border-dashed border-[#F3D1DC] dark:border-[#4A363D] flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-11 sm:pr-10 touch-pan-y select-none"
          >
            <div className="flex items-start sm:items-center gap-2 text-xs text-[#7D6B6D] dark:text-[#C7B0B7]">
              <Bookmark className="w-3.5 h-3.5 text-[#FF8FA3] fill-[#FFE5EC] dark:fill-[#4D303A] shrink-0 mt-0.5 sm:mt-0" />
              <MoveHorizontal className="w-3.5 h-3.5 text-[#FF8FA3] shrink-0 mt-0.5 sm:mt-0" />
              <span className="italic">
                Vuốt thanh cuối trang, bấm nút chuyển hoặc chạm góc giấy gấp bên phải để lật trang sổ
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
              {onFlipPrev && prevPageLabel && (
                <motion.button
                  type="button"
                  whileHover={{ x: -2 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={onFlipPrev}
                  className="min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-xl bg-[#FFFDF9] dark:bg-[#312429] hover:bg-[#FFF0F3] dark:hover:bg-[#3D2D33] border border-[#F3D1DC] dark:border-[#553F47] text-xs font-semibold text-[#7D6B6D] dark:text-[#E2CCD3] hover:text-[#4A3B3E] dark:hover:text-white shadow-2xs transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 text-[#FF8FA3] shrink-0" />
                  <span>{prevPageLabel}</span>
                </motion.button>
              )}

              {onFlipNext && nextPageLabel && (
                <motion.button
                  type="button"
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={onFlipNext}
                  className="min-h-[44px] sm:min-h-0 group inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF8FA3] to-[#FF758F] dark:from-[#E06D82] dark:to-[#C9596E] text-white text-xs font-semibold shadow-[0_6px_18px_rgba(255,143,163,0.32)] dark:shadow-[0_6px_18px_rgba(0,0,0,0.35)] transition-transform cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>{nextPageLabel}</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </motion.button>
              )}
            </div>
          </motion.div>

          {/* Interactive Folded Paper Corner Curl (Bottom-Right) using GPU scale */}
          {onFlipNext && (
            <button
              type="button"
              onMouseEnter={() => setIsCornerHovered(true)}
              onMouseLeave={() => setIsCornerHovered(false)}
              onClick={onFlipNext}
              title={nextPageLabel || 'Lật sang trang tiếp theo'}
              aria-label={nextPageLabel || 'Lật sang trang tiếp theo'}
              className="group/curl absolute bottom-0 right-0 w-14 h-14 overflow-hidden cursor-pointer z-30"
            >
              <motion.div
                animate={{
                  scale: isCornerHovered ? 1.18 : 1,
                }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{ transformOrigin: 'bottom right' }}
                className="absolute bottom-0 right-0 w-11 h-11 bg-gradient-to-tl from-[#FFE5EC] via-[#FFF0F3] to-white dark:from-[#3D2B32] dark:via-[#33242A] dark:to-[#2A1E23] border-t border-l border-[#FFB3C1] dark:border-[#6E4D58] rounded-tl-2xl shadow-[-4px_-4px_12px_rgba(255,143,163,0.22)] dark:shadow-[-4px_-4px_12px_rgba(0,0,0,0.38)] flex items-end justify-end p-1.5"
              >
                <Heart className="w-3.5 h-3.5 text-[#FF8FA3] fill-[#FF8FA3] opacity-85" />
              </motion.div>
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
