'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import {
  BookOpen,
  Camera,
  CloudRain,
  CloudSun,
  EyeOff,
  Feather,
  Gift,
  Heart,
  Images,
  LogOut,
  Menu,
  MessageCircleHeart,
  Moon,
  MoonStar,
  RotateCw,
  Settings,
  Sparkles,
  StickyNote,
  Sun,
  X,
  Zap,
} from 'lucide-react';
import SealedLetterGate from '@/components/SealedLetterGate';
import AmbientAudioToggle from '@/components/AmbientAudioToggle';
import StarfallAmbience from '@/components/StarfallAmbience';
import ScrapbookPageSection, {
  type ScrapbookTabItem,
} from '@/components/ScrapbookPageSection';
import InkHandwritingTitle from '@/components/InkHandwritingTitle';
import PolaroidGallery from '@/components/PolaroidGallery';
import ChatCompanion from '@/components/ChatCompanion';
import HealingExtras from '@/components/HealingExtras';
import HealingMiniGameModal from '@/components/HealingMiniGameModal';
import AdminManagementStudio from '@/components/AdminManagementStudio';
import {
  DataService,
  DEFAULT_EXTERNAL_GAMES,
  DEFAULT_MOOD_JARS,
  DEFAULT_MOOD_PRESET_CONFIG,
  DEFAULT_MUSIC_TRACKS,
  DEFAULT_SETTINGS,
  INITIAL_MOOD_DIARY_ENTRIES,
  MOOD_DIARY_EMOTIONS,
  SEED_POLAROID_PHOTOS,
  playGentleGameChime,
  playPaperFlipSound,
} from '@/lib/data-service';
import { getEmotionVisual } from '@/lib/mood-visuals';
import { signOutFirebaseAccount } from '@/lib/firebase';
import type {
  AppSettings,
  ExternalGameItem,
  MoodCheckInTrigger,
  MoodDiaryEmotion,
  MoodDiaryEntry,
  MoodJarItem,
  MoodPresetConfig,
  MusicTargetSection,
  MusicTrackItem,
  PolaroidPhoto,
  UserSession,
  WeatherMode,
  WishEntry,
} from '@/lib/types';

const SCRAPBOOK_TABS: ScrapbookTabItem[] = [
  {
    index: 0,
    pageNumber: '01',
    shortLabel: 'Trang 01 · Bìa Sổ',
    title: 'Trang 01: Lời Tựa & Khoảnh Khắc Tiêu Điểm',
  },
  {
    index: 1,
    pageNumber: '02',
    shortLabel: 'Trang 02 · Polaroid',
    title: 'Trang 02: Tường Ảnh Polaroid Kỷ Niệm',
  },
  {
    index: 2,
    pageNumber: '03',
    shortLabel: 'Trang 03 · Hũ Kẹo & Thư',
    title: 'Trang 03: Hũ Kẹo Cảm Xúc & Hộp Thư Nhỏ',
  },
];

export default function ScrapbookWorkspace() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isPreviewingAsHer, setIsPreviewingAsHer] = useState(false);

  const [photos, setPhotos] = useState<PolaroidPhoto[]>(SEED_POLAROID_PHOTOS);
  const [moodJars, setMoodJars] = useState<MoodJarItem[]>(DEFAULT_MOOD_JARS);
  const [wishes, setWishes] = useState<WishEntry[]>([]);
  const [musicTracks, setMusicTracks] =
    useState<MusicTrackItem[]>(DEFAULT_MUSIC_TRACKS);
  const [externalGames, setExternalGames] = useState<ExternalGameItem[]>(
    DEFAULT_EXTERNAL_GAMES
  );
  const [moodDiaryEntries, setMoodDiaryEntries] = useState<MoodDiaryEntry[]>(
    INITIAL_MOOD_DIARY_ENTRIES
  );
  const [moodPresetConfig, setMoodPresetConfig] = useState<MoodPresetConfig>(
    DEFAULT_MOOD_PRESET_CONFIG
  );
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = React.useRef<HTMLDivElement | null>(null);
  const [isMiniGameOpen, setIsMiniGameOpen] = useState(false);
  const [recentMoodContext, setRecentMoodContext] = useState<string>('');
  const [recentWishContext, setRecentWishContext] = useState<string>('');

  // Cozy Candlelight Night Reading Mode
  const [isCandlelightMode, setIsCandlelightMode] = useState<boolean>(false);

  // Smooth Mode ('Chế độ Siêu Mượt'): auto-optimized by device + manual toggle
  const [isSmoothMode, setIsSmoothMode] = useState<boolean>(false);

  // Time-of-Day Weather Ambience ('auto' | 'sunny' | 'rain' | 'starlight' | 'off')
  const [weatherMode, setWeatherMode] = useState<WeatherMode>('auto');

  // Quick Mood Tracker trigger & inline toast feedback
  const [moodCheckInTrigger, setMoodCheckInTrigger] =
    useState<MoodCheckInTrigger | null>(null);
  const [quickMoodFeedback, setQuickMoodFeedback] = useState<string | null>(null);
  const quickMoodTimerRef = React.useRef<number | null>(null);

  // Scrapbook Page State (0: Trang Bìa, 1: Tường Ảnh Polaroid, 2: Hũ Kẹo Cảm Xúc)
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [flipDirection, setFlipDirection] = useState<number>(1);
  const [inkReplaySignal, setInkReplaySignal] = useState<number>(0);
  const [isFeaturedFlipped, setIsFeaturedFlipped] = useState<boolean>(false);
  const [heroHeartPulseKey, setHeroHeartPulseKey] = useState<number>(0);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(e.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  const handleSelectPageIndex = (nextIndex: number) => {
    setIsMobileMenuOpen(false);
    const clamped = Math.max(0, Math.min(2, nextIndex));
    if (clamped === activePageIndex) {
      if (clamped === 0) {
        setInkReplaySignal((prev) => prev + 1);
      }
      return;
    }
    playPaperFlipSound();
    setFlipDirection(clamped > activePageIndex ? 1 : -1);
    setActivePageIndex(clamped);
    if (clamped === 0) {
      setInkReplaySignal((prev) => prev + 1);
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: isSmoothMode ? 'auto' : 'smooth' });
    }
  };

  const handleToggleCandlelight = () => {
    setIsCandlelightMode((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('gnqa_candlelight_mode', next ? '1' : '0');
      }
      return next;
    });
  };

  const handleToggleSmoothMode = () => {
    setIsSmoothMode((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('gnqa_smooth_mode', next ? '1' : '0');
      }
      return next;
    });
  };

  const handleCycleWeatherMode = () => {
    const order: WeatherMode[] = ['auto', 'sunny', 'rain', 'starlight', 'off'];
    setWeatherMode((prev) => {
      const idx = order.indexOf(prev);
      const next = order[(idx + 1) % order.length];
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('gnqa_weather_mode_v1', next);
      }
      return next;
    });
  };

  const handleQuickMoodSelect = (emotion: MoodDiaryEmotion) => {
    playGentleGameChime(659.25);
    const created = DataService.addMoodDiaryEntry(emotion, '');
    setMoodDiaryEntries((prev) => [created, ...prev]);
    setRecentMoodContext(created.emotionLabel);
    setMoodCheckInTrigger((prev) => ({
      id: Math.max(created.timestamp, (prev?.id ?? 0) + 1),
      emotion,
      emotionLabel: created.emotionLabel,
      createdAt: created.createdAt,
    }));
    setQuickMoodFeedback(created.emotionLabel);
    if (quickMoodTimerRef.current) {
      window.clearTimeout(quickMoodTimerRef.current);
    }
    quickMoodTimerRef.current = window.setTimeout(() => {
      setQuickMoodFeedback(null);
    }, 4000);
  };

  // Sync html.dark class whenever theme toggles (supports night auto-detection)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', isCandlelightMode);
  }, [isCandlelightMode]);

  // Sync html.smooth-mode class whenever Smooth Mode toggles
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('smooth-mode', isSmoothMode);
  }, [isSmoothMode]);

  useEffect(() => {
    let active = true;

    // Step 1: Instant <1ms microtask hydration from local cache / seed defaults
    queueMicrotask(() => {
      if (!active) return;
      if (typeof window !== 'undefined') {
        const savedCandle = window.localStorage.getItem('gnqa_candlelight_mode');
        if (savedCandle === '1') {
          setIsCandlelightMode(true);
        } else if (savedCandle === null) {
          const hour = new Date().getHours();
          if (hour >= 18 || hour < 6) {
            setIsCandlelightMode(true);
          }
        }

        const savedSmooth = window.localStorage.getItem('gnqa_smooth_mode');
        if (savedSmooth === '1') {
          setIsSmoothMode(true);
        } else if (savedSmooth === '0') {
          setIsSmoothMode(false);
        } else {
          const prefersReduced =
            window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
          const lowCores =
            typeof navigator !== 'undefined' &&
            typeof navigator.hardwareConcurrency === 'number' &&
            navigator.hardwareConcurrency <= 4;
          const navMem =
            typeof navigator !== 'undefined'
              ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory
              : undefined;
          const lowMem = typeof navMem === 'number' && navMem <= 4;
          if (prefersReduced || lowCores || lowMem) {
            setIsSmoothMode(true);
          }
        }

        const savedWeather = window.localStorage.getItem('gnqa_weather_mode_v1');
        if (
          savedWeather === 'auto' ||
          savedWeather === 'sunny' ||
          savedWeather === 'rain' ||
          savedWeather === 'starlight' ||
          savedWeather === 'off'
        ) {
          setWeatherMode(savedWeather);
        }
      }
      setSession(DataService.getSession());
      setSettings(DataService.getSettings());
      setMoodJars(DataService.getMoodJars());
      setWishes(DataService.getWishes());
      setMusicTracks(DataService.getMusicTracks());
      setExternalGames(DataService.getExternalGames());
      setMoodDiaryEntries(DataService.getMoodDiaryEntries());
      setMoodPresetConfig(DataService.getMoodPresetConfig());
      setIsHydrated(true);
    });

    // Step 2: Load local IndexedDB photos & music playlist (< 15ms, zero network round-trip)
    DataService.getLocalPhotosOnly().then((localPhotos) => {
      if (!active) return;
      if (localPhotos && localPhotos.length > 0) {
        setPhotos((prev) =>
          prev === SEED_POLAROID_PHOTOS ? localPhotos : prev
        );
      }
    });

    DataService.getLocalMusicTracksOnly().then((localTracks) => {
      if (!active) return;
      if (localTracks && localTracks.length > 0) {
        setMusicTracks((prev) =>
          prev === DEFAULT_MUSIC_TRACKS || prev.length <= localTracks.length
            ? localTracks
            : prev
        );
      }
    });

    // Step 3: Single background delta sync with Server DB (?since=<lastSyncAt>)
    DataService.syncAllFromServer().then((serverSnap) => {
      if (!active || !serverSnap || serverSnap.unchanged) return;
      if (serverSnap.settings) setSettings(serverSnap.settings);
      if (serverSnap.moodJars) setMoodJars(serverSnap.moodJars);
      if (serverSnap.wishes) setWishes(serverSnap.wishes);
      if (serverSnap.musicTracks) setMusicTracks(serverSnap.musicTracks);
      if (serverSnap.externalGames) setExternalGames(serverSnap.externalGames);
      if (serverSnap.moodDiaryEntries) {
        setMoodDiaryEntries(serverSnap.moodDiaryEntries);
      }
      if (serverSnap.moodPresetConfig) {
        setMoodPresetConfig(serverSnap.moodPresetConfig);
      }
      if (serverSnap.photos && serverSnap.photos.length > 0) {
        setPhotos(serverSnap.photos);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    await signOutFirebaseAccount();
    DataService.clearSession();
    setSession(null);
    setIsPreviewingAsHer(false);
  };

  const handleToggleHeroPhotoLike = async (
    e: React.MouseEvent,
    photo: PolaroidPhoto
  ) => {
    e.stopPropagation();
    setHeroHeartPulseKey((prev) => prev + 1);
    const updated: PolaroidPhoto = {
      ...photo,
      isLiked: true,
      likes: photo.likes + 1,
    };
    const nextList = photos.map((p) => (p.id === photo.id ? updated : p));
    setPhotos(nextList);
    await DataService.savePhoto(updated);
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] dark:bg-[#1B1417] flex items-center justify-center p-6 transition-colors duration-500">
        <div className="text-center">
          <Heart className="w-8 h-8 text-[#FF8FA3] fill-[#FF8FA3] mx-auto mb-3" />
          <p
            className="text-lg text-[#4A3B3E] dark:text-[#F6EAEF]"
            style={{ fontFamily: 'var(--font-playfair), serif' }}
          >
            Đang mở Góc Nhỏ Chữa Lành...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <MotionConfig reducedMotion={isSmoothMode ? 'always' : 'user'}>
        <SealedLetterGate onSuccess={(newSession) => setSession(newSession)} />
      </MotionConfig>
    );
  }

  // Pure Management Studio for role 'thanh' (when not in preview mode)
  if (session.role === 'thanh' && !isPreviewingAsHer) {
    return (
      <MotionConfig reducedMotion={isSmoothMode ? 'always' : 'user'}>
        <AdminManagementStudio
          session={session}
          photos={photos}
          onPhotosChange={setPhotos}
          moodJars={moodJars}
          onMoodJarsChange={setMoodJars}
          wishes={wishes}
          onWishesChange={setWishes}
          musicTracks={musicTracks}
          onMusicTracksChange={setMusicTracks}
          externalGames={externalGames}
          onExternalGamesChange={setExternalGames}
          moodDiaryEntries={moodDiaryEntries}
          onMoodDiaryEntriesChange={setMoodDiaryEntries}
          moodPresetConfig={moodPresetConfig}
          onMoodPresetConfigChange={setMoodPresetConfig}
          settings={settings}
          onSettingsChange={setSettings}
          isCandlelightMode={isCandlelightMode}
          onToggleCandlelight={handleToggleCandlelight}
          onTogglePreview={() => setIsPreviewingAsHer(true)}
          onLogout={handleLogout}
        />
      </MotionConfig>
    );
  }

  const senderAlias = settings.senderAlias || 'X';
  const featuredPhoto =
    photos.find((p) => p.featured) || photos[0] || SEED_POLAROID_PHOTOS[0];
  const totalLikes = photos.reduce((acc, item) => acc + item.likes, 0);

  const activeMusicSection: MusicTargetSection = isMiniGameOpen
    ? 'minigame'
    : activePageIndex === 0
      ? 'page_01'
      : activePageIndex === 1
        ? 'page_02'
        : 'page_03';

  const weatherLabel =
    weatherMode === 'auto'
      ? 'Theo giờ'
      : weatherMode === 'sunny'
        ? 'Nắng vàng'
        : weatherMode === 'rain'
          ? 'Mưa chậm'
          : weatherMode === 'starlight'
            ? 'Sao đêm'
            : 'Tắt trời';

  return (
    <MotionConfig reducedMotion={isSmoothMode ? 'always' : 'user'}>
    <div
      className={`min-h-[100dvh] overflow-x-clip relative selection:bg-[#FFE5EC] dark:selection:bg-[#4F323C] transition-colors duration-700 ${
        isCandlelightMode
          ? 'bg-[#1B1417] text-[#F6EAEF]'
          : 'bg-[#FFFDF9] text-[#4A3B3E]'
      }`}
    >
      {/* Soft Pastel or Cozy Candlelight Mesh Background (Pure Radial Gradients — zero blur filter) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 transition-opacity duration-700"
        style={{
          background: isCandlelightMode
            ? 'radial-gradient(circle at 16% 18%, rgba(255, 165, 120, 0.14) 0%, transparent 45%), radial-gradient(circle at 84% 24%, rgba(255, 143, 163, 0.14) 0%, transparent 48%), radial-gradient(circle at 50% 82%, rgba(255, 183, 120, 0.11) 0%, transparent 55%)'
            : 'radial-gradient(circle at 12% 18%, #FFF0F3 0%, transparent 40%), radial-gradient(circle at 88% 22%, #FFE5EC 0%, transparent 45%), radial-gradient(circle at 50% 85%, #FFF0F3 0%, transparent 50%)',
        }}
      />

      {/* Warm Amber Candlelight Vignette Glow */}
      {isCandlelightMode && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-10 mix-blend-soft-light opacity-45"
          style={{
            background:
              'radial-gradient(circle at 50% 35%, rgba(255, 205, 150, 0.3), rgba(14, 9, 11, 0.72))',
          }}
        />
      )}

      {/* Time-of-Day CSS GPU Weather & Starfall Ambience */}
      <StarfallAmbience weatherMode={weatherMode} />

      {/* Floating Preview Return Bar when admin is previewing */}
      {session.role === 'thanh' && isPreviewingAsHer && (
        <div className="sticky top-0 z-50 bg-[#3D3234]/95 dark:bg-[#23191D]/95 backdrop-blur-md text-white px-3 sm:px-4 pt-[calc(0.6rem+env(safe-area-inset-top))] pb-2.5 text-xs flex items-center justify-between gap-2 shadow-md border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-[#FF8FA3] shrink-0" />
            <span className="truncate">
              Đang xem thử giao diện của <strong>{settings.herNickname}</strong>{' '}
              <span className="hidden sm:inline">
                (Biệt danh người gửi: <strong>{senderAlias}</strong>)
              </span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsPreviewingAsHer(false)}
            className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF8FA3] hover:bg-[#FF7A91] text-white font-medium transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="sm:hidden">Về Studio</span>
            <span className="hidden sm:inline">Quay Lại Studio Quản Lý</span>
          </button>
        </div>
      )}

      {/* Top Navigation Bar — Floating Glass Pill with Persistent Section-Aware Audio Player */}
      <div className="sticky top-[calc(0.65rem+env(safe-area-inset-top))] z-40 px-3 sm:px-6 max-w-6xl mx-auto">
        <header
          ref={mobileMenuRef}
          className={`relative flex items-center justify-between gap-2 sm:gap-5 px-3 sm:px-6 py-2 sm:py-3 rounded-full backdrop-blur-xl border transition-colors duration-500 ${
            isCandlelightMode
              ? 'bg-[#2B2024]/86 border-[#523B43] shadow-[0_12px_36px_rgba(0,0,0,0.42)]'
              : 'bg-white/86 border-[#F7D6E0] shadow-[0_8px_28px_rgba(255,143,163,0.12)]'
          }`}
        >
          {/* Zone 1: Single Text Element Brand Wordmark */}
          <button
            type="button"
            onClick={() => handleSelectPageIndex(0)}
            className={`min-h-[44px] sm:min-h-0 flex items-center text-sm min-[380px]:text-base sm:text-lg font-bold tracking-tight truncate max-w-[135px] min-[380px]:max-w-[170px] sm:max-w-none shrink cursor-pointer ${
              isCandlelightMode ? 'text-[#FFF0F3]' : 'text-[#4A3B3E]'
            }`}
            style={{ fontFamily: 'var(--font-playfair), serif' }}
          >
            <span className="truncate">Góc Nhỏ Chữa Lành</span>
          </button>

          {/* Zone 2: Concise Single-Line Navigation Links (Desktop lg+) */}
          <nav
            className={`hidden lg:flex items-center gap-5 text-sm font-medium ${
              isCandlelightMode ? 'text-[#E2C6CE]' : 'text-[#7D6B6D]'
            }`}
          >
            <button
              type="button"
              onClick={() => handleSelectPageIndex(0)}
              className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activePageIndex === 0
                  ? 'text-[#FF8FA3] font-semibold underline underline-offset-4'
                  : 'hover:text-[#FF8FA3]'
              }`}
            >
              Trang Bìa (01)
            </button>
            <button
              type="button"
              onClick={() => handleSelectPageIndex(1)}
              className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activePageIndex === 1
                  ? 'text-[#FF8FA3] font-semibold underline underline-offset-4'
                  : 'hover:text-[#FF8FA3]'
              }`}
            >
              Tường Ảnh Polaroid (02)
            </button>
            <button
              type="button"
              onClick={() => handleSelectPageIndex(2)}
              className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activePageIndex === 2
                  ? 'text-[#FF8FA3] font-semibold underline underline-offset-4'
                  : 'hover:text-[#FF8FA3]'
              }`}
            >
              Hũ Kẹo &amp; Hộp Thư (03)
            </button>
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="hover:text-[#FF8FA3] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Tâm Sự Cùng {senderAlias}
            </button>
          </nav>

          {/* Zone 3: Persistent Audio Player + Desktop Controls + Mobile Utilities Drawer Trigger */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <AmbientAudioToggle
              musicTracks={musicTracks}
              activeSection={activeMusicSection}
              senderAlias={senderAlias}
            />

            {/* Inline secondary controls on Tablet/Desktop (md+) */}
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCycleWeatherMode}
                title={
                  weatherMode === 'auto'
                    ? 'Thời tiết theo giờ: Tự động (nhấn để xem thử Nắng vàng / Mưa chậm / Sao đêm / Tắt)'
                    : weatherMode === 'sunny'
                      ? 'Đang xem thử hiệu ứng: Nắng vàng ấm (nhấn để đổi)'
                      : weatherMode === 'rain'
                        ? 'Đang xem thử hiệu ứng: Mưa rơi chậm (nhấn để đổi)'
                        : weatherMode === 'starlight'
                          ? 'Đang xem thử hiệu ứng: Sao đêm (nhấn để đổi)'
                          : 'Hiệu ứng thời tiết đang tắt (nhấn để bật lại)'
                }
                className={`px-2.5 sm:px-3 py-2 text-xs font-medium rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5 border ${
                  weatherMode === 'off'
                    ? isCandlelightMode
                      ? 'bg-[#2C2024] text-[#9A8189] border-[#4A363D]'
                      : 'bg-[#FFFDF9] text-[#9E878A] border-[#F3D1DC]'
                    : isCandlelightMode
                      ? 'bg-[#35262B] hover:bg-[#443138] text-[#FFD6A5] border-[#523B43]'
                      : 'bg-[#FFFDF9] hover:bg-[#FFF0F3] text-[#7D6B6D] border-[#F3D1DC]'
                }`}
              >
                {weatherMode === 'sunny' ? (
                  <Sun className="w-3.5 h-3.5 text-[#E09F24]" />
                ) : weatherMode === 'rain' ? (
                  <CloudRain className="w-3.5 h-3.5 text-[#4A8BC2] dark:text-[#8BC4F5]" />
                ) : weatherMode === 'starlight' ? (
                  <MoonStar className="w-3.5 h-3.5 text-[#D95B72] dark:text-[#FF9EB0]" />
                ) : weatherMode === 'off' ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <CloudSun className="w-3.5 h-3.5 text-[#FF8FA3]" />
                )}
                <span className="hidden xl:inline">{weatherLabel}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleSmoothMode}
                aria-pressed={isSmoothMode}
                title={
                  isSmoothMode
                    ? 'Đang bật Chế độ Siêu Mượt (giảm làm mờ và chuyển động nặng)'
                    : 'Bật Chế độ Siêu Mượt giúp ứng dụng nhẹ và phản hồi tức thì hơn'
                }
                className={`px-3 py-2 text-xs font-medium rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5 border ${
                  isSmoothMode
                    ? 'bg-[#FF8FA3] text-white border-[#FF8FA3] dark:bg-[#E06D82] dark:border-[#E06D82] shadow-xs'
                    : isCandlelightMode
                      ? 'bg-[#35262B] hover:bg-[#443138] text-[#E2C6CE] border-[#523B43]'
                      : 'bg-[#FFFDF9] hover:bg-[#FFF0F3] text-[#7D6B6D] border-[#F3D1DC]'
                }`}
              >
                <Zap
                  className={`w-3.5 h-3.5 ${
                    isSmoothMode
                      ? 'text-white fill-white'
                      : isCandlelightMode
                        ? 'text-[#FFD6A5]'
                        : 'text-[#D95B72]'
                  }`}
                />
                <span className="hidden lg:inline">
                  {isSmoothMode ? 'Siêu mượt' : 'Hiệu ứng'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleToggleCandlelight}
                title={
                  isCandlelightMode
                    ? 'Chuyển về chế độ Nắng Sớm Ban Ngày'
                    : 'Bật chế độ Ánh Đèn Đêm ấm áp'
                }
                className={`px-3 py-2 text-xs font-medium rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5 border ${
                  isCandlelightMode
                    ? 'bg-[#4E383E] text-[#FFD6A5] border-[#8A626C] shadow-[0_0_15px_rgba(255,214,165,0.2)]'
                    : 'bg-[#FFFDF9] hover:bg-[#FFF0F3] text-[#7D6B6D] border-[#F3D1DC]'
                }`}
              >
                {isCandlelightMode ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-[#FFD6A5]" />
                    <span className="hidden lg:inline">Nắng Sớm</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-[#D95B72]" />
                    <span className="hidden lg:inline">Ánh Đèn Đêm</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className={`px-3 sm:px-3.5 py-2 text-xs font-medium rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
                  isCandlelightMode
                    ? 'bg-[#4E383E] hover:bg-[#5E434B] text-[#FFF0F3]'
                    : 'text-[#4A3B3E] bg-[#FFF0F3] hover:bg-[#FFE5EC]'
                }`}
              >
                <LogOut className="w-3.5 h-3.5 text-[#FF8FA3]" />
                <span>Khóa Sổ</span>
              </button>
            </div>

            {/* Mobile Compact Utilities Menu Button (< md) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label={isMobileMenuOpen ? 'Đóng menu tiện ích' : 'Mở menu tiện ích'}
              aria-expanded={isMobileMenuOpen}
              className={`md:hidden min-w-[44px] min-h-[44px] rounded-full border transition-colors inline-flex items-center justify-center shrink-0 cursor-pointer ${
                isMobileMenuOpen
                  ? 'bg-[#FF8FA3] text-white border-[#FF8FA3] dark:bg-[#E06D82] dark:border-[#E06D82]'
                  : isCandlelightMode
                    ? 'bg-[#35262B] text-[#FFD6A5] border-[#523B43]'
                    : 'bg-[#FFFDF9] text-[#7D6B6D] border-[#F3D1DC]'
              }`}
            >
              {isMobileMenuOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Mobile Compact Utilities Popover Menu (< md) */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.16 }}
                className={`md:hidden fixed left-3 right-3 top-[calc(4.75rem+env(safe-area-inset-top))] max-h-[calc(100dvh-6.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] overflow-y-auto rounded-2xl border backdrop-blur-xl p-3.5 z-50 space-y-2.5 ${
                  isCandlelightMode
                    ? 'bg-[#271D21]/95 border-[#523B43] shadow-[0_20px_50px_rgba(0,0,0,0.6)] text-[#F6EAEF]'
                    : 'bg-white/95 border-[#F3D1DC] shadow-[0_18px_46px_rgba(74,59,62,0.22)] text-[#4A3B3E]'
                }`}
              >
                <div className="text-[11px] font-semibold text-[#7D6B6D] dark:text-[#C7B0B7] px-1">
                  Tiện ích không gian
                </div>

                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    type="button"
                    onClick={handleCycleWeatherMode}
                    className="min-h-[44px] w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#FFFDF9] dark:bg-[#2E2227] border border-[#F3D1DC] dark:border-[#533D45] text-xs font-medium cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-2">
                      {weatherMode === 'sunny' ? (
                        <Sun className="w-4 h-4 text-[#E09F24]" />
                      ) : weatherMode === 'rain' ? (
                        <CloudRain className="w-4 h-4 text-[#4A8BC2] dark:text-[#8BC4F5]" />
                      ) : weatherMode === 'starlight' ? (
                        <MoonStar className="w-4 h-4 text-[#D95B72] dark:text-[#FF9EB0]" />
                      ) : weatherMode === 'off' ? (
                        <EyeOff className="w-4 h-4 text-[#9E878A]" />
                      ) : (
                        <CloudSun className="w-4 h-4 text-[#FF8FA3]" />
                      )}
                      <span>Hiệu ứng thời tiết</span>
                    </span>
                    <span className="text-[11px] font-semibold text-[#D95B72] dark:text-[#FF9EB0]">
                      {weatherLabel}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleSmoothMode}
                    aria-pressed={isSmoothMode}
                    className="min-h-[44px] w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#FFFDF9] dark:bg-[#2E2227] border border-[#F3D1DC] dark:border-[#533D45] text-xs font-medium cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Zap
                        className={`w-4 h-4 ${
                          isSmoothMode
                            ? 'text-[#FF8FA3] fill-[#FF8FA3]'
                            : 'text-[#D95B72] dark:text-[#FFD6A5]'
                        }`}
                      />
                      <span>Chế độ Siêu Mượt</span>
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        isSmoothMode
                          ? 'bg-[#FF8FA3] text-white'
                          : 'bg-[#FFF0F3] dark:bg-[#3A2930] text-[#7D6B6D] dark:text-[#C7B0B7]'
                      }`}
                    >
                      {isSmoothMode ? 'Đang bật' : 'Hiệu ứng đầy đủ'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleCandlelight}
                    className="min-h-[44px] w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#FFFDF9] dark:bg-[#2E2227] border border-[#F3D1DC] dark:border-[#533D45] text-xs font-medium cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-2">
                      {isCandlelightMode ? (
                        <Sun className="w-4 h-4 text-[#FFD6A5]" />
                      ) : (
                        <Moon className="w-4 h-4 text-[#D95B72]" />
                      )}
                      <span>Ánh sáng đọc sổ</span>
                    </span>
                    <span className="text-[11px] font-semibold text-[#D95B72] dark:text-[#FFD6A5]">
                      {isCandlelightMode ? 'Ánh Đèn Đêm' : 'Nắng Sớm'}
                    </span>
                  </button>
                </div>

                <div className="pt-2 border-t border-[#F7E4EA] dark:border-[#4A363D]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="min-h-[44px] w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#FFF0F3] dark:bg-[#3A2930] hover:bg-[#FFE5EC] text-[#C94A63] dark:text-[#FF9EB0] text-xs font-semibold cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Khóa Sổ Lưu Niệm</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>
      </div>

      {/* Main 3D Scrapbook Content Container */}
      <main
        id="top"
        className="relative z-10 max-w-6xl mx-auto px-3 sm:px-6 pt-5 sm:pt-8 pb-12 md:pb-24 text-[#4A3B3E] dark:text-[#F6EAEF]"
      >
        {/* SCRAPBOOK PAGE 01: Prominent Hero, Ink Handwriting Title & 3D Flip Featured Polaroid */}
        {activePageIndex === 0 && (
          <ScrapbookPageSection
            id="hero-page"
            pageNumber="01"
            totalPages="03"
            chapterTitle="Lời Tựa & Khoảnh Khắc Tiêu Điểm"
            chapterSubtitle={`Trang mở đầu sổ lưu niệm dành tặng ${settings.herNickname}`}
            flipDirection={flipDirection}
            onFlipNext={() => handleSelectPageIndex(1)}
            nextPageLabel="Lật sang Trang 02: Tường Ảnh Polaroid"
            activePageIndex={activePageIndex}
            onSelectPageIndex={handleSelectPageIndex}
            tabs={SCRAPBOOK_TABS}
          >
            {/* Quick One-Tap Mood Tracker Strip at Top of Page 01 */}
            <div className="mb-6 px-3.5 sm:px-5 py-3.5 rounded-2xl bg-white dark:bg-[#312429] border border-[#F7D6E0] dark:border-[#533D45] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 transition-colors duration-500">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#4A3B3E] dark:text-[#F6EAEF]">
                  Hôm nay {settings.herNickname} thấy thế nào?
                </div>
                <p className="text-[11px] text-[#7D6B6D] dark:text-[#C7B0B7] mt-0.5 line-clamp-2 sm:truncate">
                  {quickMoodFeedback
                    ? `Đã lưu nhịp "${quickMoodFeedback}" · ${senderAlias} vừa ghé lời nhắn nhẹ cho cậu`
                    : `Chạm chọn một cảm xúc để lưu vào nhật ký & gợi chuyện cùng ${senderAlias}`}
                </p>
              </div>

              <div className="grid grid-cols-3 min-[460px]:grid-cols-5 lg:flex lg:items-center gap-1.5 sm:gap-2 shrink-0">
                {MOOD_DIARY_EMOTIONS.map((item) => {
                  const isActive = moodDiaryEntries[0]?.emotion === item.key;
                  const { Icon, colorClass, bgClass, activeClass } =
                    getEmotionVisual(item.key);
                  return (
                    <button
                      key={`hero-mood-${item.key}`}
                      type="button"
                      onClick={() => handleQuickMoodSelect(item.key)}
                      title={`${item.label} — ${item.subtitle}`}
                      className={`min-h-[44px] px-2 sm:px-3 py-2 rounded-xl border text-[11px] font-semibold inline-flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        isActive
                          ? activeClass
                          : `${bgClass} opacity-85 hover:opacity-100 text-[#4A3B3E] dark:text-[#F6EAEF]`
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${colorClass}`} />
                      <span className="text-[10px] sm:text-[11px]">
                        {item.shortLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 items-stretch">
              {/* Left Column: Ink Handwriting Title & Primary Actions */}
              <div className="lg:col-span-7 flex flex-col justify-between bg-white dark:bg-[#312429] rounded-3xl border border-[#F7D6E0] dark:border-[#533D45] p-5 sm:p-8 lg:p-10 shadow-[0_14px_42px_rgba(255,143,163,0.12)] dark:shadow-[0_14px_42px_rgba(0,0,0,0.35)] relative overflow-hidden transition-colors duration-500">
                {/* Subtle Corner Sun & Sparkle Decoration (Static to save GPU) */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-6 -right-6 w-24 h-24 rounded-full bg-[#FFF0F3]/80 dark:bg-[#3F2C33]/80 border border-[#F7D6E0] dark:border-[#5E424C] flex items-center justify-center opacity-70"
                >
                  {isCandlelightMode ? (
                    <Moon className="w-9 h-9 text-[#FFD6A5]" />
                  ) : (
                    <Sun className="w-10 h-10 text-[#FFB3C1]" />
                  )}
                </div>

                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
                    <div className="inline-flex items-center gap-2 text-xs font-medium text-[#D95B72] dark:text-[#FF9EB0]">
                      <Sparkles className="w-3.5 h-3.5 text-[#FF8FA3]" />
                      <span>Dành tặng riêng cho {settings.herNickname}</span>
                    </div>
                  </div>

                  {/* Ink Handwriting Title Component ("Góc Nhỏ Chữa Lành") */}
                  <InkHandwritingTitle
                    herNickname={settings.herNickname}
                    senderAlias={senderAlias}
                    replaySignal={inkReplaySignal}
                  />

                  <p className="mt-4 sm:mt-5 text-sm sm:text-base text-[#7D6B6D] dark:text-[#C7B0B7] leading-relaxed max-w-2xl">
                    {settings.welcomeNote}
                  </p>

                  {/* Sender alias note banner */}
                  <div className="mt-5 sm:mt-6 p-3.5 sm:p-4 rounded-2xl bg-[#FFFDF9] dark:bg-[#241A1E] border border-[#F3D1DC] dark:border-[#4A363D] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-[#7D6B6D] dark:text-[#C7B0B7]">
                    <div className="flex items-start sm:items-center gap-2 min-w-0">
                      <Feather className="w-3.5 h-3.5 text-[#FF8FA3] shrink-0 mt-0.5 sm:mt-0" />
                      <span>
                        Người gửi:{' '}
                        <strong className="text-[#4A3B3E] dark:text-[#F6EAEF] font-semibold">
                          {senderAlias}
                        </strong>{' '}
                        · Luôn sẵn sàng lắng nghe cậu tâm sự
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsChatOpen(true)}
                      className="self-start sm:self-auto min-h-[36px] sm:min-h-0 inline-flex items-center text-[#D95B72] dark:text-[#FF9EB0] font-semibold hover:underline cursor-pointer shrink-0"
                    >
                      Mở trạm lắng nghe →
                    </button>
                  </div>
                </div>

                <div className="relative z-10 mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-[#F7E4EA] dark:border-[#4A363D] flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3.5 flex-wrap">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleSelectPageIndex(1)}
                    className="min-h-[44px] px-5 sm:px-6 py-3 rounded-xl bg-[#FF8FA3] hover:bg-[#FF7A91] dark:bg-[#E06D82] dark:hover:bg-[#CE5D72] text-white text-xs sm:text-sm font-semibold shadow-[0_8px_25px_rgba(255,143,163,0.35)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.35)] transition-colors inline-flex items-center justify-center gap-2 whitespace-normal sm:whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Images className="w-4 h-4 shrink-0" />
                    <span>Lật Xem {photos.length} Khoảnh Khắc Polaroid</span>
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleSelectPageIndex(2)}
                    className="min-h-[44px] px-5 py-3 rounded-xl bg-[#FFF0F3] dark:bg-[#3A2930] hover:bg-[#FFE5EC] dark:hover:bg-[#49343C] text-[#D95B72] dark:text-[#FF9EB0] text-xs sm:text-sm font-semibold border border-[#F3D1DC] dark:border-[#5D414B] transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Gift className="w-4 h-4 text-[#FF8FA3] shrink-0" />
                    <span>Hũ Kẹo &amp; Hộp Thư Nhỏ</span>
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => setIsChatOpen(true)}
                    className="min-h-[44px] px-4 py-3 rounded-xl bg-[#FFFDF9] dark:bg-[#2A1F23] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2930] text-[#4A3B3E] dark:text-[#F6EAEF] text-xs sm:text-sm font-semibold border border-[#F3D1DC] dark:border-[#4D3840] transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <MessageCircleHeart className="w-4 h-4 text-[#FF8FA3] shrink-0" />
                    <span>Tâm Sự Cùng {senderAlias}</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Interactive 180° Flip Featured Polaroid Card */}
              <div
                className="lg:col-span-5 flex items-center justify-center"
                style={{ perspective: '1600px' }}
              >
                <motion.div
                  animate={{ rotateY: isFeaturedFlipped ? 180 : 0 }}
                  transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                  style={{ transformStyle: 'preserve-3d' }}
                  className="w-full h-full relative"
                >
                  {/* FRONT OF FEATURED POLAROID */}
                  <div
                    style={{ backfaceVisibility: 'hidden' }}
                    className="w-full h-full bg-white dark:bg-[#32252A] rounded-3xl p-5 pb-7 border border-[#F7D6E0] dark:border-[#553F47] shadow-[0_16px_45px_rgba(255,143,163,0.22)] dark:shadow-[0_16px_45px_rgba(0,0,0,0.45)] flex flex-col justify-between relative group transition-colors duration-500"
                  >
                    {/* Washi tape decoration */}
                    <div
                      aria-hidden="true"
                      className="w-24 h-5 bg-[#FFF0F3]/90 dark:bg-[#4B343D]/90 border border-[#F7D6E0] dark:border-[#6A4A56] mx-auto -mt-7 mb-2 rounded-sm shadow-2xs"
                    />

                    <div
                      onClick={() => {
                        playPaperFlipSound();
                        setIsFeaturedFlipped(true);
                      }}
                      className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#FFF0F3] dark:bg-[#23191D] cursor-pointer"
                    >
                      <img
                        src={featuredPhoto.imageUrl}
                        alt={featuredPhoto.caption}
                        loading="eager"
                        decoding="async"
                        fetchPriority="high"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 dark:bg-[#23191D]/92 text-[11px] font-semibold text-[#D95B72] dark:text-[#FF9EB0] shadow-xs border border-transparent dark:border-[#553F47]">
                        <Sparkles className="w-3 h-3 text-[#FF8FA3]" />
                        <span>Khoảnh khắc tiêu điểm</span>
                      </div>

                      <div className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4A3B3E]/85 dark:bg-[#161013]/88 text-[11px] font-medium text-white shadow-xs">
                        <RotateCw className="w-3 h-3 text-[#FFB3C1]" />
                        <span>Chạm để lật mặt sau ảnh</span>
                      </div>
                    </div>

                    <div className="mt-5">
                      <p
                        className="text-[17px] text-[#4A3B3E] dark:text-[#F6EAEF] leading-relaxed"
                        style={{
                          fontFamily:
                            'var(--font-handwriting), var(--font-playfair), cursive',
                        }}
                      >
                        &ldquo;{featuredPhoto.caption}&rdquo;
                      </p>

                      <div className="mt-3.5 pt-3 border-t border-[#F9EBEF] dark:border-[#4A363D] flex items-center justify-between gap-2 text-xs text-[#7D6B6D] dark:text-[#C7B0B7]">
                        <button
                          type="button"
                          onClick={() => {
                            playPaperFlipSound();
                            setIsFeaturedFlipped(true);
                          }}
                          className="inline-flex items-center gap-1.5 text-[#D95B72] dark:text-[#FF9EB0] font-semibold hover:underline cursor-pointer"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>Lật đọc lời nhắn mặt sau</span>
                        </button>

                        <div className="relative">
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.85 }}
                            onClick={(e) =>
                              handleToggleHeroPhotoLike(e, featuredPhoto)
                            }
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              featuredPhoto.isLiked
                                ? 'text-[#FF6B88] dark:text-[#FF9EB0] bg-[#FFF0F3] dark:bg-[#432E36]'
                                : 'text-[#7D6B6D] dark:text-[#C7B0B7] hover:bg-[#FFF0F3] dark:hover:bg-[#432E36]'
                            }`}
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${
                                featuredPhoto.isLiked
                                  ? 'fill-[#FF6B88] text-[#FF6B88]'
                                  : ''
                              }`}
                            />
                            <span className="tabular-nums">
                              {featuredPhoto.likes}
                            </span>
                          </motion.button>

                          <AnimatePresence>
                            {heroHeartPulseKey > 0 && (
                              <motion.span
                                key={`hero-heart-${heroHeartPulseKey}`}
                                initial={{ opacity: 0.95, y: 0, scale: 0.6 }}
                                animate={{
                                  opacity: [0.95, 1, 0],
                                  y: -38,
                                  scale: [0.6, 1.35, 1],
                                }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.75, ease: 'easeOut' }}
                                className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2"
                              >
                                <Heart className="w-4 h-4 text-[#FF6B88] fill-[#FF6B88]" />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BACK OF FEATURED POLAROID (Handwritten Story Note) */}
                  <div
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                    className="absolute inset-0 bg-[#FFFDF9] dark:bg-[#2D2126] rounded-3xl p-5 sm:p-8 border border-[#FFB3C1] dark:border-[#6A4A56] shadow-[0_16px_45px_rgba(255,143,163,0.22)] dark:shadow-[0_16px_45px_rgba(0,0,0,0.48)] flex flex-col justify-between overflow-y-auto"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 pb-4 border-b border-dashed border-[#F3D1DC] dark:border-[#4D373F]">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D95B72] dark:text-[#FF9EB0]">
                          <Feather className="w-3.5 h-3.5 text-[#FF8FA3]" />
                          <span>Mặt sau bức ảnh Polaroid</span>
                        </span>
                        <span className="text-xs text-[#7D6B6D] dark:text-[#C7B0B7] tabular-nums">
                          {featuredPhoto.date}
                        </span>
                      </div>

                      <h3
                        className="mt-4 sm:mt-5 text-lg sm:text-xl font-semibold text-[#4A3B3E] dark:text-[#F6EAEF]"
                        style={{ fontFamily: 'var(--font-playfair), serif' }}
                      >
                        Đôi Dòng {senderAlias} Viết Cho Khoảnh Khắc Này
                      </h3>

                      <p
                        className="mt-3 sm:mt-4 text-sm sm:text-base text-[#4A3B3E] dark:text-[#EFE0E6] leading-relaxed"
                        style={{
                          fontFamily:
                            'var(--font-handwriting), var(--font-playfair), cursive',
                        }}
                      >
                        &ldquo;{featuredPhoto.story}&rdquo;
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-dashed border-[#F3D1DC] dark:border-[#4D373F] flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs text-[#7D6B6D] dark:text-[#C7B0B7]">
                        Chủ đề:{' '}
                        <strong className="text-[#D95B72] dark:text-[#FF9EB0]">
                          {featuredPhoto.emotionTag}
                        </strong>
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          playPaperFlipSound();
                          setIsFeaturedFlipped(false);
                        }}
                        className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FFF0F3] dark:bg-[#3A2930] hover:bg-[#FFE5EC] dark:hover:bg-[#49343C] text-[#D95B72] dark:text-[#FF9EB0] text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Lật lại mặt trước ảnh</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Full-Width Key Memory Strip Below Hero Split */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => handleSelectPageIndex(1)}
                className="text-left bg-white dark:bg-[#312429] hover:bg-[#FFF0F3]/60 dark:hover:bg-[#3B2B31] rounded-2xl border border-[#F7E4EA] dark:border-[#4D3840] px-5 py-4 shadow-xs transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs text-[#7D6B6D] dark:text-[#C7B0B7]">
                  <span>Sổ lưu niệm Polaroid</span>
                  <Camera className="w-4 h-4 text-[#FF8FA3] group-hover:scale-110 transition-transform" />
                </div>
                <div
                  className="text-2xl font-semibold text-[#4A3B3E] dark:text-[#F6EAEF] mt-1 tabular-nums"
                  style={{ fontFamily: 'var(--font-playfair), serif' }}
                >
                  {photos.length} khoảnh khắc
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPageIndex(1)}
                className="text-left bg-white dark:bg-[#312429] hover:bg-[#FFF0F3]/60 dark:hover:bg-[#3B2B31] rounded-2xl border border-[#F7E4EA] dark:border-[#4D3840] px-5 py-4 shadow-xs transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs text-[#7D6B6D] dark:text-[#C7B0B7]">
                  <span>Sự yêu thích</span>
                  <Heart className="w-4 h-4 text-[#FF6B88] fill-[#FF6B88] group-hover:scale-110 transition-transform" />
                </div>
                <div
                  className="text-2xl font-semibold text-[#D95B72] dark:text-[#FF9EB0] mt-1 tabular-nums"
                  style={{ fontFamily: 'var(--font-playfair), serif' }}
                >
                  {totalLikes} lượt thả tim
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPageIndex(2)}
                className="text-left bg-white dark:bg-[#312429] hover:bg-[#FFF0F3]/60 dark:hover:bg-[#3B2B31] rounded-2xl border border-[#F7E4EA] dark:border-[#4D3840] px-5 py-4 shadow-xs transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs text-[#7D6B6D] dark:text-[#C7B0B7]">
                  <span>Hũ kẹo &amp; Hộp thư</span>
                  <StickyNote className="w-4 h-4 text-[#FF8FA3] group-hover:scale-110 transition-transform" />
                </div>
                <div
                  className="text-2xl font-semibold text-[#4A3B3E] dark:text-[#F6EAEF] mt-1 tabular-nums"
                  style={{ fontFamily: 'var(--font-playfair), serif' }}
                >
                  {moodJars.reduce((sum, j) => sum + j.messages.length, 0)} viên
                  kẹo · {wishes.length} giấy note
                </div>
              </button>
            </div>
          </ScrapbookPageSection>
        )}

        {/* SCRAPBOOK PAGE 02: Polaroid Photo Gallery */}
        {activePageIndex === 1 && (
          <ScrapbookPageSection
            id="gallery-page"
            pageNumber="02"
            totalPages="03"
            chapterTitle="Tường Ảnh Polaroid Kỷ Niệm"
            chapterSubtitle="Chạm vào từng bức hình để phóng to, lật đọc mặt sau hoặc bật trình chiếu kỷ niệm"
            flipDirection={flipDirection}
            onFlipPrev={() => handleSelectPageIndex(0)}
            prevPageLabel="Lật về Trang 01: Trang Bìa"
            onFlipNext={() => handleSelectPageIndex(2)}
            nextPageLabel="Lật sang Trang 03: Hũ Kẹo & Hộp Thư"
            activePageIndex={activePageIndex}
            onSelectPageIndex={handleSelectPageIndex}
            tabs={SCRAPBOOK_TABS}
          >
            <PolaroidGallery
              photos={photos}
              onPhotosChange={setPhotos}
              userRole={isPreviewingAsHer ? 'her' : session.role}
              isUploadModalOpen={isUploadModalOpen}
              setIsUploadModalOpen={setIsUploadModalOpen}
              senderAlias={senderAlias}
            />
          </ScrapbookPageSection>
        )}

        {/* SCRAPBOOK PAGE 03: Healing Mood Jars & Sticky Notes Mailbox */}
        {activePageIndex === 2 && (
          <ScrapbookPageSection
            id="jars-page"
            pageNumber="03"
            totalPages="03"
            chapterTitle="Hũ Kẹo Cảm Xúc & Hộp Thư Gửi X"
            chapterSubtitle={`4 chiếc lọ tinh thần và bảng giấy note hai chiều dành riêng cho ${settings.herNickname}`}
            flipDirection={flipDirection}
            onFlipPrev={() => handleSelectPageIndex(1)}
            prevPageLabel="Lật về Trang 02: Tường Ảnh"
            onFlipNext={() => handleSelectPageIndex(0)}
            nextPageLabel="Lật về Trang Bìa (Trang 01)"
            activePageIndex={activePageIndex}
            onSelectPageIndex={handleSelectPageIndex}
            tabs={SCRAPBOOK_TABS}
          >
            <HealingExtras
              userRole={isPreviewingAsHer ? 'her' : session.role}
              moodJars={moodJars}
              onMoodJarsChange={setMoodJars}
              wishes={wishes}
              onWishesChange={setWishes}
              settings={settings}
              onSettingsChange={setSettings}
              onSelectMoodContext={setRecentMoodContext}
              onSelectWishContext={setRecentWishContext}
              onOpenMiniGame={() => setIsMiniGameOpen(true)}
            />
          </ScrapbookPageSection>
        )}
      </main>

      {/* Subtle Pop-Up Healing Mini-Game Modal */}
      <HealingMiniGameModal
        isOpen={isMiniGameOpen}
        onClose={() => setIsMiniGameOpen(false)}
        herNickname={settings.herNickname}
        senderAlias={senderAlias}
        externalGames={externalGames}
      />

      {/* Unified Mobile Bottom Navigation Bar (4 evenly-spaced buttons, zero overlap with Chatbot X) */}
      <nav
        aria-label="Điều hướng nhanh trên điện thoại"
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl px-2 pt-1.5 pb-[calc(0.45rem+env(safe-area-inset-bottom))] transition-colors duration-500 ${
          isCandlelightMode
            ? 'bg-[#251B1F]/92 border-[#523B43] shadow-[0_-8px_28px_rgba(0,0,0,0.42)]'
            : 'bg-white/92 border-[#F3D1DC] shadow-[0_-8px_28px_rgba(255,143,163,0.14)]'
        }`}
      >
        <div className="grid grid-cols-4 items-center gap-1 max-w-lg mx-auto">
          <button
            type="button"
            onClick={() => {
              setIsChatOpen(false);
              handleSelectPageIndex(0);
            }}
            className={`min-h-[48px] py-1.5 px-1 rounded-xl text-[10px] font-semibold flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              !isChatOpen && activePageIndex === 0
                ? 'bg-[#FF8FA3] text-white shadow-xs'
                : isCandlelightMode
                  ? 'text-[#E2C6CE]'
                  : 'text-[#7D6B6D]'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span className="truncate max-w-full">Trang 01</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsChatOpen(false);
              handleSelectPageIndex(1);
            }}
            className={`min-h-[48px] py-1.5 px-1 rounded-xl text-[10px] font-semibold flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              !isChatOpen && activePageIndex === 1
                ? 'bg-[#FF8FA3] text-white shadow-xs'
                : isCandlelightMode
                  ? 'text-[#E2C6CE]'
                  : 'text-[#7D6B6D]'
            }`}
          >
            <Images className="w-4 h-4 shrink-0" />
            <span className="truncate max-w-full">Trang 02</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsChatOpen(false);
              handleSelectPageIndex(2);
            }}
            className={`min-h-[48px] py-1.5 px-1 rounded-xl text-[10px] font-semibold flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              !isChatOpen && activePageIndex === 2
                ? 'bg-[#FF8FA3] text-white shadow-xs'
                : isCandlelightMode
                  ? 'text-[#E2C6CE]'
                  : 'text-[#7D6B6D]'
            }`}
          >
            <Gift className="w-4 h-4 shrink-0" />
            <span className="truncate max-w-full">Trang 03</span>
          </button>

          <button
            type="button"
            onClick={() => setIsChatOpen((prev) => !prev)}
            className={`relative min-h-[48px] py-1.5 px-1 rounded-xl text-[10px] font-semibold flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              isChatOpen
                ? 'bg-[#FF8FA3] text-white shadow-xs'
                : isCandlelightMode
                  ? 'text-[#FFD6A5]'
                  : 'text-[#D95B72]'
            }`}
          >
            <span className="relative inline-flex">
              <MessageCircleHeart className="w-4 h-4 shrink-0" />
              {!isChatOpen && chatUnreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#FF6B88] text-white text-[9px] font-bold inline-flex items-center justify-center shadow-xs tabular-nums">
                  {chatUnreadCount}
                </span>
              )}
            </span>
            <span className="truncate max-w-full">Trò chuyện</span>
          </button>
        </div>
      </nav>

      {/* Floating Corner Chatbot Widget (Desktop md+ trigger; Mobile uses 4th bottom-nav tab) */}
      <ChatCompanion
        herNickname={settings.herNickname}
        senderAlias={senderAlias}
        recentMood={recentMoodContext}
        recentWish={recentWishContext}
        polaroidHighlights={photos.map((p) => ({
          id: p.id,
          caption: p.caption,
          story: p.story,
          date: p.date,
          emotionTag: p.emotionTag,
          imageUrl: p.imageUrl,
        }))}
        wishHighlights={wishes.slice(0, 6).map((w) => ({
          title: w.title,
          note: w.note,
          category: w.category,
          fulfilled: w.fulfilledByThanh,
          thanhReply: w.thanhReply,
        }))}
        isOpen={isChatOpen}
        onOpenChange={setIsChatOpen}
        onUnreadCountChange={setChatUnreadCount}
        moodDiaryEntries={moodDiaryEntries}
        onMoodDiaryEntriesChange={setMoodDiaryEntries}
        onSelectMoodContext={setRecentMoodContext}
        onNavigateToGallery={() => handleSelectPageIndex(1)}
        latestMoodEmotion={moodDiaryEntries[0]?.emotion}
        moodCheckInTrigger={moodCheckInTrigger}
        onQuickMoodSelect={handleQuickMoodSelect}
      />

      {/* Quiet Editorial Footer */}
      <footer
        className={`relative z-10 border-t pt-7 pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:py-8 px-4 sm:px-6 transition-colors duration-500 ${
          isCandlelightMode
            ? 'border-[#4A363D] bg-[#21181B] text-[#C7B0B7]'
            : 'border-[#F7D6E0] bg-white text-[#7D6B6D]'
        }`}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-center sm:text-left">
          <div className="flex items-center justify-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-[#FF8FA3] shrink-0" />
            <span>Góc Nhỏ Chữa Lành · {settings.secretHeaderNote}</span>
          </div>
          <div className="flex items-center justify-center gap-x-3 gap-y-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleSelectPageIndex(0)}
              className="hover:text-[#FF8FA3] transition-colors cursor-pointer"
            >
              Trang Bìa
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => handleSelectPageIndex(1)}
              className="hover:text-[#FF8FA3] transition-colors cursor-pointer"
            >
              Tường Ảnh Polaroid
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => handleSelectPageIndex(2)}
              className="hover:text-[#FF8FA3] transition-colors cursor-pointer"
            >
              Hũ Kẹo &amp; Hộp Thư
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="hover:text-[#FF8FA3] transition-colors cursor-pointer"
            >
              Tâm Sự Cùng {senderAlias}
            </button>
          </div>
        </div>
      </footer>
    </div>
    </MotionConfig>
  );
}
