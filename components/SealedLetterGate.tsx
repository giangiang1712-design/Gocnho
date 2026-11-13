'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Feather,
  Heart,
  KeyRound,
  Lock,
  LockOpen,
  Moon,
  Sparkles,
  Sun,
} from 'lucide-react';
import { DataService, playPaperFlipSound } from '@/lib/data-service';
import { signInWithFirebaseAccount, isFirebaseConfigured } from '@/lib/firebase';
import StarfallAmbience from '@/components/StarfallAmbience';
import type { UserSession } from '@/lib/types';

interface SealedLetterGateProps {
  onSuccess: (session: UserSession) => void;
}

export default function SealedLetterGate({ onSuccess }: SealedLetterGateProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isFlapOpen, setIsFlapOpen] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [adminHintActive, setAdminHintActive] = useState(false);
  const [isNightMode, setIsNightMode] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => {
      if (typeof window === 'undefined') return;
      const saved = window.localStorage.getItem('gnqa_candlelight_mode');
      const shouldDark =
        saved === '1' ||
        (saved === null && (new Date().getHours() >= 18 || new Date().getHours() < 6));
      setIsNightMode(shouldDark);
    });
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', isNightMode);
  }, [isNightMode]);

  const toggleNightMode = () => {
    setIsNightMode((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('gnqa_candlelight_mode', next ? '1' : '0');
      }
      return next;
    });
  };

  const performUnlock = async (targetUser: string, targetPass: string) => {
    setError('');
    const session = DataService.authenticate(targetUser, targetPass);
    if (!session) {
      setError(
        'Mật mã chưa đúng rồi. Quỳnh Anh thử kiểm tra lại hoặc chạm vào chìa khóa gợi ý bên dưới nhé!'
      );
      return;
    }

    playPaperFlipSound();
    setIsFlapOpen(true);

    if (isFirebaseConfigured()) {
      try {
        await signInWithFirebaseAccount(targetUser, targetPass);
      } catch {
        // Proceed with local session seamlessly
      }
    }

    setTimeout(() => {
      setIsOpening(true);
    }, 520);

    setTimeout(() => {
      onSuccess(session);
    }, 980);
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    await performUnlock(username, password);
  };

  const fillHerPreset = () => {
    setError('');
    setAdminHintActive(false);
    setUsername('quynhanh');
    setPassword('gocnho123');
    setIsFlapOpen(true);
    playPaperFlipSound();
  };

  const handleDiscreetAdminClick = () => {
    setError('');
    setAdminHintActive(true);
    setUsername('anhthanh');
    setPassword('admin123');
    setIsFlapOpen(true);
    playPaperFlipSound();
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center px-3.5 sm:px-4 pt-[calc(4.25rem+env(safe-area-inset-top))] pb-[calc(4.5rem+env(safe-area-inset-bottom))] relative overflow-x-clip bg-[#FFFDF9] dark:bg-[#1B1417] transition-colors duration-700">
      {/* Soft Pastel / Warm Night Mesh Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-85"
        style={{
          background: isNightMode
            ? 'radial-gradient(circle at 20% 20%, rgba(255, 160, 122, 0.14) 0%, transparent 45%), radial-gradient(circle at 80% 30%, rgba(255, 143, 163, 0.14) 0%, transparent 50%), radial-gradient(circle at 50% 85%, rgba(255, 183, 120, 0.1) 0%, transparent 55%)'
            : 'radial-gradient(circle at 20% 20%, #FFF0F3 0%, transparent 45%), radial-gradient(circle at 80% 30%, #FFE5EC 0%, transparent 50%), radial-gradient(circle at 50% 85%, #FFF0F3 0%, transparent 55%)',
        }}
      />

      {/* Top-Right Warm Night Mode Toggle */}
      <button
        type="button"
        onClick={toggleNightMode}
        title={isNightMode ? 'Chuyển sang Nắng Sớm Ban Ngày' : 'Bật Ánh Đèn Đêm dịu mắt'}
        className="fixed top-[calc(0.85rem+env(safe-area-inset-top))] right-3 sm:right-4 z-30 inline-flex items-center gap-1.5 px-3.5 min-h-[44px] py-2 rounded-full bg-white/85 dark:bg-[#2B2024]/85 backdrop-blur-md border border-[#F3D1DC] dark:border-[#533D45] text-xs font-medium text-[#7D6B6D] dark:text-[#FFD6A5] shadow-xs hover:bg-[#FFF0F3] dark:hover:bg-[#3A2A30] transition-colors cursor-pointer"
      >
        {isNightMode ? (
          <>
            <Sun className="w-3.5 h-3.5 text-[#FFD6A5]" />
            <span>Nắng Sớm</span>
          </>
        ) : (
          <>
            <Moon className="w-3.5 h-3.5 text-[#D95B72]" />
            <span>Ánh Đèn Đêm</span>
          </>
        )}
      </button>

      {/* Gentle Corner Starfall Ambience */}
      <StarfallAmbience />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{
          opacity: isOpening ? 0 : 1,
          scale: isOpening ? 1.05 : 1,
          y: isOpening ? -24 : 0,
        }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* 3D Interactive Wax-Sealed Envelope Header Visual */}
        <div
          className="relative mx-auto w-56 sm:w-64 h-32 sm:h-36 mb-4 select-none"
          style={{ perspective: '1200px' }}
        >
          {/* Envelope Back Body */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#FFE5EC] to-[#F9D5E0] dark:from-[#3D2B32] dark:to-[#2D1F25] border border-[#F3C1CF] dark:border-[#5C414B] shadow-[0_12px_30px_rgba(255,143,163,0.22)] dark:shadow-[0_12px_30px_rgba(0,0,0,0.45)] overflow-hidden" />

          {/* Rising Inner Letter Card inside the Envelope */}
          <motion.div
            animate={{
              y: isFlapOpen ? -24 : 6,
              scale: isFlapOpen ? 1.02 : 0.96,
            }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-4 top-3 bottom-3 rounded-xl bg-[#FFFDF9] dark:bg-[#271D21] border border-[#F3D1DC] dark:border-[#533D45] shadow-sm p-3 flex flex-col items-center justify-center text-center z-10"
          >
            <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#D95B72] dark:text-[#FF9EB0]">
              <Feather className="w-3 h-3 text-[#FF8FA3]" />
              <span>Gửi riêng Quỳnh Anh</span>
            </div>
            <p
              className="text-xs text-[#4A3B3E] dark:text-[#F6EAEF] mt-1 line-clamp-2"
              style={{ fontFamily: 'var(--font-handwriting), var(--font-playfair), cursive' }}
            >
              &ldquo;Chạm mở dấu sáp để bước vào góc nhỏ bình yên...&rdquo;
            </p>
          </motion.div>

          {/* Envelope Front Side Fold Flaps */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-2xl z-20 overflow-hidden"
          >
            <div
              className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#FFF0F3] via-[#FFE5EC]/95 to-transparent dark:from-[#332429] dark:via-[#3D2B32]/95 border-t border-[#F7D6E0] dark:border-[#553F47]"
              style={{
                clipPath: 'polygon(0 18%, 50% 62%, 100% 18%, 100% 100%, 0 100%)',
              }}
            />
          </div>

          {/* 3D Rotating Top Triangular Flap */}
          <motion.div
            animate={{
              rotateX: isFlapOpen ? -175 : 0,
            }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{
              transformOrigin: 'top center',
              transformStyle: 'preserve-3d',
            }}
            className="absolute inset-x-0 top-0 h-24 z-30 pointer-events-none"
          >
            <div
              className="w-full h-full bg-gradient-to-b from-[#FFD6E0] to-[#FFE5EC] dark:from-[#49333C] dark:to-[#3A2930] border-b border-[#F3C1CF] dark:border-[#634651] rounded-t-2xl shadow-xs"
              style={{
                clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
              }}
            />
          </motion.div>

          {/* Fluttering Hearts & Sparkles rising when Envelope Opens */}
          <AnimatePresence>
            {isFlapOpen && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 flex justify-center z-40"
              >
                {[
                  { x: -38, y: -56, delay: 0.05, color: '#FF8FA3', isSparkle: false },
                  { x: 34, y: -64, delay: 0.1, color: '#FFD166', isSparkle: true },
                  { x: -12, y: -72, delay: 0.14, color: '#FF6B88', isSparkle: false },
                  { x: 18, y: -48, delay: 0.18, color: '#FFB3C1', isSparkle: false },
                ].map((p, idx) => (
                  <motion.span
                    key={`env-heart-${idx}`}
                    initial={{ opacity: 0, x: 0, y: 20, scale: 0.4 }}
                    animate={{
                      opacity: [0, 1, 0],
                      x: p.x,
                      y: p.y,
                      scale: [0.4, 1.1, 0.8],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.9, delay: p.delay, ease: 'easeOut' }}
                    style={{ color: p.color }}
                    className="absolute"
                  >
                    {p.isSparkle ? (
                      <Sparkles className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Heart className="w-3.5 h-3.5 fill-current" />
                    )}
                  </motion.span>
                ))}
              </div>
            )}
          </AnimatePresence>

          {/* Interactive Rose-Gold Wax Seal Stamp */}
          <motion.button
            type="button"
            onClick={fillHerPreset}
            animate={{
              scale: isFlapOpen ? 0.78 : 1,
              y: isFlapOpen ? -42 : 0,
              opacity: isFlapOpen ? 0.85 : 1,
            }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            transition={{
              duration: 0.35,
              ease: 'easeInOut',
            }}
            title="Chạm vào con dấu sáp để mở phong thư"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-13 h-13 rounded-full bg-gradient-to-br from-[#FF8FA3] via-[#E05772] to-[#C94A63] border-2 border-[#FFF0F3] shadow-[0_6px_18px_rgba(217,91,114,0.42)] flex items-center justify-center cursor-pointer"
          >
            <Heart className="w-5 h-5 text-white fill-white" />
          </motion.button>
        </div>

        {/* Main Letter Card */}
        <div className="bg-white dark:bg-[#271D21] rounded-3xl border border-[#F7D6E0] dark:border-[#4D3840] shadow-[0_16px_45px_rgba(255,143,163,0.16)] dark:shadow-[0_20px_55px_rgba(0,0,0,0.48)] p-5 sm:p-10 relative overflow-hidden transition-colors duration-500">
          <div className="flex flex-col items-center text-center mb-6 sm:mb-7">
            <p className="text-xs tracking-wide text-[#7D6B6D] dark:text-[#C7B0B7] mb-1.5 inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FF8FA3] shrink-0" />
              <span>Bức thư niêm phong · Dành riêng cho Quỳnh Anh</span>
            </p>
            <h1
              className="text-2xl min-[380px]:text-3xl sm:text-4xl font-semibold text-[#4A3B3E] dark:text-[#F6EAEF] leading-tight"
              style={{
                fontFamily: 'var(--font-playfair), serif',
                textWrap: 'balance',
              }}
            >
              Góc Nhỏ Chữa Lành
            </h1>
            <p className="mt-2.5 sm:mt-3 text-sm sm:text-base text-[#7D6B6D] dark:text-[#C7B0B7] max-w-md leading-relaxed">
              &ldquo;Một góc nhỏ bình yên tớ cất giữ dành riêng cho những ngày
              Quỳnh Anh cần thêm chút dịu dàng và một nơi thoải mái để sẻ
              chia.&rdquo;
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label
                htmlFor="gate-username"
                className="block text-xs font-medium text-[#4A3B3E] dark:text-[#F6EAEF] mb-1.5"
              >
                Tên người nhận thư
              </label>
              <input
                id="gate-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên tài khoản (quynhanh)"
                required
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#FFFDF9] dark:bg-[#1E161A]/90 border border-[#F3D1DC] dark:border-[#533D45] text-[#4A3B3E] dark:text-[#F6EAEF] placeholder-[#B39EA1] dark:placeholder-[#9A8189] text-base sm:text-sm focus:outline-none focus:border-[#FF8FA3] focus:ring-2 focus:ring-[#FFE5EC] dark:focus:ring-[#4A2E38] transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="gate-password"
                className="block text-xs font-medium text-[#4A3B3E] dark:text-[#F6EAEF] mb-1.5"
              >
                Mật mã mở phong thư
              </label>
              <input
                id="gate-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật mã..."
                required
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#FFFDF9] dark:bg-[#1E161A]/90 border border-[#F3D1DC] dark:border-[#533D45] text-[#4A3B3E] dark:text-[#F6EAEF] placeholder-[#B39EA1] dark:placeholder-[#9A8189] text-base sm:text-sm focus:outline-none focus:border-[#FF8FA3] focus:ring-2 focus:ring-[#FFE5EC] dark:focus:ring-[#4A2E38] transition-colors"
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-[#C94A63] dark:text-[#FF9EB0] bg-[#FFF0F3] dark:bg-[#3F262E] px-3.5 py-2.5 rounded-xl border border-[#FFB3C1] dark:border-[#6E4452]"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isOpening}
              className="w-full min-h-[48px] py-3.5 px-6 rounded-xl bg-[#FF8FA3] hover:bg-[#FF7A91] dark:bg-[#E06D82] dark:hover:bg-[#CE5D72] active:scale-[0.99] text-white font-medium text-sm shadow-[0_8px_20px_rgba(255,143,163,0.32)] dark:shadow-[0_8px_20px_rgba(0,0,0,0.4)] transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <LockOpen className="w-4 h-4" />
              <span>
                {isOpening
                  ? 'Đang mở phong thư 3D...'
                  : adminHintActive
                  ? 'Mở Studio Quản Lý'
                  : 'Mở Phong Thư Góc Nhỏ'}
              </span>
            </button>
          </form>

          {/* Exclusive Key Card for Quỳnh Anh Only */}
          <div className="mt-6 sm:mt-7 pt-5 border-t border-[#F7E4EA] dark:border-[#4A363D]">
            <button
              type="button"
              onClick={fillHerPreset}
              className="w-full min-h-[48px] flex items-center justify-between gap-2 px-3.5 sm:px-4 py-3 rounded-2xl bg-[#FFFDF9]/90 dark:bg-[#312429]/85 hover:bg-[#FFF0F3] dark:hover:bg-[#3D2C33] border border-[#F3D1DC] dark:border-[#533D45] text-left transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#FFF0F3] dark:bg-[#3F2C33] border border-[#FFCCD5] dark:border-[#634651] flex items-center justify-center text-[#FF8FA3] shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#4A3B3E] dark:text-[#F6EAEF] group-hover:text-[#D95B72] dark:group-hover:text-[#FF9EB0]">
                    Chìa khóa mở thư dành riêng cho Quỳnh Anh
                  </div>
                  <div className="text-[11px] text-[#7D6B6D] dark:text-[#C7B0B7] mt-0.5 tabular-nums">
                    Chạm vào đây hoặc con dấu sáp để tự động điền (quynhanh · gocnho123)
                  </div>
                </div>
              </div>
              <KeyRound className="w-4 h-4 text-[#B39EA1] dark:text-[#9D838B] group-hover:text-[#FF8FA3] shrink-0" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Discreet Corner Lock Button for Admin / Studio Management */}
      <button
        type="button"
        onClick={handleDiscreetAdminClick}
        title="Lối vào Studio Quản Lý (Dành cho người chuẩn bị)"
        aria-label="Lối vào Studio Quản Lý"
        className={`fixed bottom-[calc(0.85rem+env(safe-area-inset-bottom))] left-3 sm:left-4 z-30 min-w-[44px] min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full backdrop-blur-md border text-[11px] transition-colors cursor-pointer ${
          adminHintActive
            ? 'bg-white dark:bg-[#312429] text-[#D95B72] dark:text-[#FF9EB0] border-[#FFB3C1] dark:border-[#634651] shadow-sm opacity-100'
            : 'bg-white/60 dark:bg-[#271D21]/70 text-[#B39EA1] dark:text-[#C7B0B7] border-[#F3D1DC]/70 dark:border-[#4D3840] opacity-55 hover:opacity-100 hover:text-[#7D6B6D] dark:hover:text-[#F6EAEF]'
        }`}
      >
        <Lock className="w-3.5 h-3.5" />
        {adminHintActive && <span>Đã điền khóa Studio</span>}
      </button>
    </div>
  );
}
