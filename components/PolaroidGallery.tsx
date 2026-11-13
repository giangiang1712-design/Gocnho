'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  motion,
  AnimatePresence,
  type PanInfo,
} from 'motion/react';
import {
  BookOpen,
  Camera,
  Heart,
  ImagePlus,
  Lock,
  MoveHorizontal,
  Pencil,
  Trash2,
  Upload,
  X,
  Check,
  Sparkles,
  Sun,
  CloudSun,
  Compass,
  Flower2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Feather,
  Pause,
  Play,
  RotateCw,
} from 'lucide-react';
import {
  compressImageFile,
  DataService,
  playPaperFlipSound,
} from '@/lib/data-service';
import type { PolaroidPhoto, UserRole } from '@/lib/types';

interface PolaroidGalleryProps {
  photos: PolaroidPhoto[];
  onPhotosChange: (updated: PolaroidPhoto[]) => void;
  userRole: UserRole;
  isUploadModalOpen: boolean;
  setIsUploadModalOpen: (open: boolean) => void;
  senderAlias?: string;
}

const PHOTOS_PER_SHEET = 4;

const EMOTION_TAGS = [
  'Tất cả',
  '#NụCườiToảNắng',
  '#NgàyDịuDàng',
  '#GócBìnhYên',
  '#TrongTrẻo',
  '#KhoảnhKhắcĐẹp',
];

const getEmotionTagIcon = (tag: string) => {
  switch (tag) {
    case '#NụCườiToảNắng':
      return Sun;
    case '#NgàyDịuDàng':
      return CloudSun;
    case '#GócBìnhYên':
      return Compass;
    case '#TrongTrẻo':
      return Flower2;
    case '#KhoảnhKhắcĐẹp':
      return Heart;
    default:
      return Sparkles;
  }
};

const FLOATING_HEART_PARTICLES = [
  { x: -34, midX: -18, y: -88, scale: 1.15, rotate: -22, delay: 0, duration: 0.95, color: '#FF6B88', size: 'w-4 h-4' },
  { x: -16, midX: -26, y: -112, scale: 0.9, rotate: -12, delay: 0.04, duration: 1.05, color: '#FF8FA3', size: 'w-3.5 h-3.5' },
  { x: -4, midX: 10, y: -96, scale: 1.3, rotate: 8, delay: 0.02, duration: 1.0, color: '#E05772', size: 'w-4 h-4' },
  { x: 14, midX: 24, y: -118, scale: 1.0, rotate: 18, delay: 0.06, duration: 1.1, color: '#FF6B88', size: 'w-3.5 h-3.5' },
  { x: 32, midX: 16, y: -84, scale: 1.1, rotate: 25, delay: 0.03, duration: 0.92, color: '#FF8FA3', size: 'w-4 h-4' },
  { x: -24, midX: -8, y: -68, scale: 0.75, rotate: -16, delay: 0.08, duration: 0.88, color: '#FFA6B8', size: 'w-3 h-3' },
  { x: 8, midX: -12, y: -128, scale: 1.2, rotate: -8, delay: 0.09, duration: 1.15, color: '#FF6B88', size: 'w-4 h-4' },
  { x: 24, midX: 30, y: -72, scale: 0.8, rotate: 15, delay: 0.11, duration: 0.9, color: '#E05772', size: 'w-3 h-3' },
];

interface HeartBurstWave {
  id: number;
  photoId: string;
}

export default function PolaroidGallery({
  photos,
  onPhotosChange,
  userRole,
  isUploadModalOpen,
  setIsUploadModalOpen,
  senderAlias = 'X',
}: PolaroidGalleryProps) {
  const [selectedTag, setSelectedTag] = useState<string>('Tất cả');
  const [currentSheetPage, setCurrentSheetPage] = useState(0);
  const [sheetFlipDirection, setSheetFlipDirection] = useState<1 | -1>(1);
  const [isSheetCornerHovered, setIsSheetCornerHovered] = useState(false);

  const [lightboxPhoto, setLightboxPhoto] = useState<PolaroidPhoto | null>(null);
  const [lightboxFlipDir, setLightboxFlipDir] = useState<1 | -1>(1);
  const [isLightboxFlipped, setIsLightboxFlipped] = useState(false);
  const [isSlideshowPlaying, setIsSlideshowPlaying] = useState(false);
  const [heartBursts, setHeartBursts] = useState<HeartBurstWave[]>([]);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const burstSeqRef = useRef(0);
  const gallerySectionRef = useRef<HTMLElement | null>(null);

  // Lightbox edit state (strictly for admin role 'thanh')
  const [isEditingLightbox, setIsEditingLightbox] = useState(false);
  const [editCaption, setEditCaption] = useState('');
  const [editStory, setEditStory] = useState('');
  const [editSecretCaption, setEditSecretCaption] = useState('');
  const [editTag, setEditTag] = useState('');

  // Upload Modal state (strictly for admin role 'thanh')
  const [previewFiles, setPreviewFiles] = useState<string[]>([]);
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadStory, setUploadStory] = useState('');
  const [uploadSecretCaption, setUploadSecretCaption] = useState('');
  const [uploadDate, setUploadDate] = useState('10.11.2026');
  const [uploadTag, setUploadTag] = useState('#NụCườiToảNắng');
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredPhotos =
    selectedTag === 'Tất cả'
      ? photos
      : photos.filter((p) => p.emotionTag === selectedTag);

  const totalSheetPages = Math.max(
    1,
    Math.ceil(filteredPhotos.length / PHOTOS_PER_SHEET)
  );
  const safeSheetPage = Math.min(currentSheetPage, totalSheetPages - 1);
  const currentSheetPhotos = filteredPhotos.slice(
    safeSheetPage * PHOTOS_PER_SHEET,
    (safeSheetPage + 1) * PHOTOS_PER_SHEET
  );

  const currentLightboxIndex = lightboxPhoto
    ? filteredPhotos.findIndex((p) => p.id === lightboxPhoto.id)
    : -1;

  const flipToSheetPage = (targetPage: number, customDir?: 1 | -1) => {
    const clamped = Math.max(0, Math.min(totalSheetPages - 1, targetPage));
    if (clamped === safeSheetPage) return;
    const dir: 1 | -1 = customDir ?? (clamped > safeSheetPage ? 1 : -1);
    playPaperFlipSound();
    setSheetFlipDirection(dir);
    setCurrentSheetPage(clamped);
  };

  const handleSheetPanEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const swipeLeft = info.offset.x < -65 || info.velocity.x < -360;
    const swipeRight = info.offset.x > 65 || info.velocity.x > 360;

    if (swipeLeft && safeSheetPage < totalSheetPages - 1) {
      flipToSheetPage(safeSheetPage + 1, 1);
    } else if (swipeRight && safeSheetPage > 0) {
      flipToSheetPage(safeSheetPage - 1, -1);
    }
  };

  const triggerHeartBurst = (photoId: string) => {
    burstSeqRef.current += 1;
    const waveId = burstSeqRef.current;
    setHeartBursts((prev) => [...prev, { id: waveId, photoId }]);
    setTimeout(() => {
      setHeartBursts((prev) => prev.filter((item) => item.id !== waveId));
    }, 1050);
  };

  const handleToggleLike = async (
    e: React.MouseEvent,
    photo: PolaroidPhoto
  ) => {
    e.stopPropagation();
    triggerHeartBurst(photo.id);

    const updatedPhoto: PolaroidPhoto = {
      ...photo,
      isLiked: true,
      likes: photo.likes + 1,
    };

    const updatedList = photos.map((p) =>
      p.id === photo.id ? updatedPhoto : p
    );
    onPhotosChange(updatedList);
    if (lightboxPhoto?.id === photo.id) {
      setLightboxPhoto(updatedPhoto);
    }
    await DataService.savePhoto(updatedPhoto);
  };

  const openLightbox = (photo: PolaroidPhoto, startSlideshow = false) => {
    playPaperFlipSound();
    setLightboxFlipDir(1);
    setLightboxPhoto(photo);
    setIsLightboxFlipped(false);
    setIsSlideshowPlaying(startSlideshow);
    setEditCaption(photo.caption);
    setEditStory(photo.story);
    setEditSecretCaption(photo.secretCaption || '');
    setEditTag(photo.emotionTag);
    setIsEditingLightbox(false);
  };

  const closeLightbox = () => {
    setLightboxPhoto(null);
    setIsSlideshowPlaying(false);
    setIsLightboxFlipped(false);
  };

  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (!lightboxPhoto || filteredPhotos.length === 0) return;
    const idx = filteredPhotos.findIndex((p) => p.id === lightboxPhoto.id);
    const nextIdx =
      direction === 'next'
        ? (idx + 1) % filteredPhotos.length
        : (idx - 1 + filteredPhotos.length) % filteredPhotos.length;
    const target = filteredPhotos[nextIdx];
    if (target) {
      playPaperFlipSound();
      setLightboxFlipDir(direction === 'next' ? 1 : -1);
      setIsLightboxFlipped(false);
      setIsEditingLightbox(false);
      setLightboxPhoto(target);
      setEditCaption(target.caption);
      setEditStory(target.story);
      setEditSecretCaption(target.secretCaption || '');
      setEditTag(target.emotionTag);
      const targetSheet = Math.floor(nextIdx / PHOTOS_PER_SHEET);
      if (targetSheet !== safeSheetPage) {
        setCurrentSheetPage(targetSheet);
      }
    }
  };

  // Auto-advance Slideshow timer
  useEffect(() => {
    if (!lightboxPhoto || !isSlideshowPlaying || filteredPhotos.length <= 1) {
      return;
    }
    const timer = window.setInterval(() => {
      setLightboxPhoto((current) => {
        if (!current) return null;
        const idx = filteredPhotos.findIndex((p) => p.id === current.id);
        const nextPhoto = filteredPhotos[(idx + 1) % filteredPhotos.length];
        if (nextPhoto) {
          setLightboxFlipDir(1);
          setIsLightboxFlipped(false);
          setEditCaption(nextPhoto.caption);
          setEditStory(nextPhoto.story);
          setEditSecretCaption(nextPhoto.secretCaption || '');
          setEditTag(nextPhoto.emotionTag);
        }
        return nextPhoto || current;
      });
    }, 4500);
    return () => window.clearInterval(timer);
  }, [lightboxPhoto?.id, isSlideshowPlaying, filteredPhotos]);

  // Keyboard navigation in Lightbox
  useEffect(() => {
    if (!lightboxPhoto || isEditingLightbox) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        navigateLightbox('next');
      } else if (e.key === 'ArrowLeft') {
        navigateLightbox('prev');
      } else if (e.key === 'Escape') {
        closeLightbox();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const handleSaveLightboxEdit = async () => {
    if (!lightboxPhoto || userRole !== 'thanh') return;
    const updatedPhoto: PolaroidPhoto = {
      ...lightboxPhoto,
      caption: editCaption.trim() || lightboxPhoto.caption,
      story: editStory.trim() || lightboxPhoto.story,
      secretCaption: editSecretCaption.trim() || undefined,
      emotionTag: editTag || lightboxPhoto.emotionTag,
    };
    const updatedList = photos.map((p) =>
      p.id === updatedPhoto.id ? updatedPhoto : p
    );
    onPhotosChange(updatedList);
    setLightboxPhoto(updatedPhoto);
    setIsEditingLightbox(false);
    await DataService.savePhoto(updatedPhoto);
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (userRole !== 'thanh') return;
    const remaining = photos.filter((p) => p.id !== photoId);
    onPhotosChange(remaining);
    setLightboxPhoto(null);
    await DataService.deletePhoto(photoId);
  };

  const processSelectedFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || userRole !== 'thanh') return;
    setIsCompressing(true);
    try {
      const compressedList: string[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (file.type.startsWith('image/')) {
          const dataUrl = await compressImageFile(file);
          compressedList.push(dataUrl);
        }
      }
      setPreviewFiles((prev) => [...prev, ...compressedList]);
    } catch {
      // Ignore invalid image
    } finally {
      setIsCompressing(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (previewFiles.length === 0 || userRole !== 'thanh') return;

    const newPhotos: PolaroidPhoto[] = [];
    for (let i = 0; i < previewFiles.length; i++) {
      const tiltValues = [-1.4, 1.2, -0.9, 1.5, -1.1, 0.8];
      const randomTilt = tiltValues[i % tiltValues.length];
      const photoItem: PolaroidPhoto = {
        id: `polaroid-${Date.now()}-${i}`,
        imageUrl: previewFiles[i],
        caption:
          uploadCaption.trim() ||
          'Thêm một khoảnh khắc thật xinh của Quỳnh Anh được lưu vào góc nhỏ.',
        story:
          uploadStory.trim() ||
          'Mỗi bức hình ở đây đều lưu giữ một năng lượng thật trong trẻo và đáng quý.',
        secretCaption: uploadSecretCaption.trim() || undefined,
        date: uploadDate.trim() || 'Hôm nay',
        emotionTag: uploadTag,
        likes: 1,
        isLiked: true,
        rotation: randomTilt,
        createdAt: Date.now() + i,
      };
      const saved = await DataService.savePhoto(photoItem);
      newPhotos.push(saved);
    }

    onPhotosChange([...newPhotos.reverse(), ...photos]);
    setCurrentSheetPage(0);
    setPreviewFiles([]);
    setUploadCaption('');
    setUploadStory('');
    setUploadSecretCaption('');
    setIsUploadModalOpen(false);
  };

  return (
    <section id="gallery" ref={gallerySectionRef} className="w-full">
      {/* Section Header & Emotion Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-7">
        <div>
          <p className="text-xs font-medium text-[#7D6B6D] dark:text-[#C7B0B7] mb-2 inline-flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-[#FF8FA3]" />
            <span>
              Sổ lưu niệm Polaroid · {photos.length} khoảnh khắc trong trẻo ·{' '}
              {totalSheetPages} tờ ảnh 3D
            </span>
          </p>
          <h2
            className="text-2xl sm:text-3xl font-semibold text-[#4A3B3E] dark:text-[#F6EAEF]"
            style={{ fontFamily: 'var(--font-playfair), serif', textWrap: 'balance' }}
          >
            Bộ Sưu Tập Khoảnh Khắc Của Quỳnh Anh
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
          {filteredPhotos.length > 0 && (
            <button
              type="button"
              onClick={() => openLightbox(filteredPhotos[0], true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FFF0F3] dark:bg-[#3A2930] hover:bg-[#FFE5EC] dark:hover:bg-[#49323B] text-[#D95B72] dark:text-[#FF9EB0] border border-[#FFCCD5] dark:border-[#5D414B] text-xs font-semibold shadow-2xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-[#D95B72] dark:fill-[#FF9EB0]" />
              <span>Trình Chiếu Kỷ Niệm (Slideshow)</span>
            </button>
          )}

          {/* Upload Button ONLY visible for Admin/Setup role */}
          {userRole === 'thanh' && (
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FF8FA3] hover:bg-[#FF7A91] dark:bg-[#E06D82] dark:hover:bg-[#CE5D72] text-white text-xs font-medium shadow-[0_8px_20px_rgba(255,143,163,0.28)] dark:shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <ImagePlus className="w-4 h-4" />
              <span>Tải Ảnh Kỷ Niệm Lên (Setup)</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Emotion Filter Controls with Icons & Sliding Pill */}
      <div className="flex items-center gap-1.5 p-1.5 bg-[#FFF0F3] dark:bg-[#2A1F24] border border-[#F7D6E0] dark:border-[#4F3941] rounded-2xl overflow-x-auto mb-7 no-scrollbar">
        {EMOTION_TAGS.map((tag) => {
          const active = selectedTag === tag;
          const TagIcon = getEmotionTagIcon(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => {
                if (selectedTag !== tag) {
                  playPaperFlipSound();
                  setSheetFlipDirection(1);
                  setSelectedTag(tag);
                  setCurrentSheetPage(0);
                }
              }}
              className={`relative px-3.5 py-2 min-h-[44px] sm:min-h-0 rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
                active
                  ? 'text-[#4A3B3E] dark:text-[#F6EAEF]'
                  : 'text-[#7D6B6D] dark:text-[#C7B0B7] hover:text-[#4A3B3E] dark:hover:text-[#F6EAEF]'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="polaroidEmotionTagPill"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  className="absolute inset-0 bg-white dark:bg-[#3A2930] rounded-xl shadow-xs border border-[#F3D1DC] dark:border-[#5D414B]"
                />
              )}
              <TagIcon
                className={`w-3.5 h-3.5 relative z-10 transition-colors ${
                  active ? 'text-[#FF6B88] dark:text-[#FF9EB0]' : 'text-[#FF8FA3]'
                }`}
              />
              <span className="relative z-10">{tag}</span>
            </button>
          );
        })}
      </div>

      {/* Polaroid Scrapbook Album Sheets */}
      {filteredPhotos.length === 0 ? (
        <div className="bg-white dark:bg-[#271D21] rounded-3xl border border-[#F7D6E0] dark:border-[#4A363D] p-12 text-center shadow-[0_10px_30px_rgba(255,143,163,0.1)] dark:shadow-[0_14px_34px_rgba(0,0,0,0.35)]">
          <Camera className="w-10 h-10 text-[#FF8FA3] mx-auto mb-3 opacity-80" />
          <h3
            className="text-xl font-semibold text-[#4A3B3E] dark:text-[#F6EAEF] mb-2"
            style={{ fontFamily: 'var(--font-playfair), serif' }}
          >
            Chưa có bức ảnh nào ở chủ đề cảm xúc này
          </h3>
          <p className="text-sm text-[#7D6B6D] dark:text-[#C7B0B7] max-w-md mx-auto mb-6">
            Quỳnh Anh có thể chọn xem tất cả ảnh để ngắm trọn bộ sưu tập nhé.
          </p>
          <button
            type="button"
            onClick={() => {
              playPaperFlipSound();
              setSelectedTag('Tất cả');
              setCurrentSheetPage(0);
            }}
            className="px-4 py-2 rounded-xl bg-[#FFF0F3] dark:bg-[#3A2930] text-[#D95B72] dark:text-[#FF9EB0] text-xs font-medium hover:bg-[#FFE5EC] dark:hover:bg-[#49323B] transition-colors cursor-pointer"
          >
            Xem tất cả ảnh
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Top Polaroid Book Sheet Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#FFFDF9] dark:bg-[#271D21] border border-[#F5D5E0] dark:border-[#4A363D] shadow-[0_6px_20px_rgba(255,143,163,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF0F3] dark:bg-[#3A2930] border border-[#FFCCD5] dark:border-[#5D414B] text-xs font-semibold text-[#D95B72] dark:text-[#FF9EB0] tabular-nums">
                <BookOpen className="w-3.5 h-3.5 text-[#FF8FA3]" />
                <span>
                  Tờ ảnh Polaroid {String(safeSheetPage + 1).padStart(2, '0')} /{' '}
                  {String(totalSheetPages).padStart(2, '0')}
                </span>
              </span>

              <span className="inline-flex items-center gap-1.5 text-xs text-[#7D6B6D] dark:text-[#C7B0B7]">
                <MoveHorizontal className="w-3.5 h-3.5 text-[#FF8FA3]" />
                <span>
                  Vuốt ngang trên trang ảnh hoặc bấm nút để chuyển tờ lưu niệm
                </span>
              </span>
            </div>

            {/* Quick Sheet Dots & Prev/Next Buttons */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {totalSheetPages > 1 && (
                <div className="flex items-center gap-1.5 mr-1">
                  {Array.from({ length: totalSheetPages }).map((_, idx) => {
                    const isCurrent = idx === safeSheetPage;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => flipToSheetPage(idx)}
                        aria-label={`Lật tới tờ ảnh Polaroid ${idx + 1}`}
                        className={`h-2 rounded-full transition-all cursor-pointer ${
                          isCurrent
                            ? 'w-6 bg-[#FF8FA3] shadow-[0_2px_8px_rgba(255,143,163,0.45)]'
                            : 'w-2 bg-[#F3C6D3] dark:bg-[#5D414B] hover:bg-[#FF8FA3]/70'
                        }`}
                      />
                    );
                  })}
                </div>
              )}

              <motion.button
                type="button"
                whileHover={{ x: -2 }}
                whileTap={{ scale: 0.94 }}
                disabled={safeSheetPage <= 0}
                onClick={() => flipToSheetPage(safeSheetPage - 1, -1)}
                className="inline-flex items-center gap-1 px-3.5 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-xl bg-white dark:bg-[#312429] hover:bg-[#FFF0F3] dark:hover:bg-[#3D2C33] disabled:opacity-40 disabled:pointer-events-none border border-[#F3D1DC] dark:border-[#533D45] text-xs font-semibold text-[#4A3B3E] dark:text-[#F6EAEF] shadow-2xs transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-[#FF8FA3]" />
                <span>Tờ trước</span>
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.94 }}
                disabled={safeSheetPage >= totalSheetPages - 1}
                onClick={() => flipToSheetPage(safeSheetPage + 1, 1)}
                className="inline-flex items-center gap-1 px-3.5 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-xl bg-gradient-to-r from-[#FF8FA3] to-[#FF758F] dark:from-[#E06D82] dark:to-[#C9586E] disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-semibold shadow-[0_4px_12px_rgba(255,143,163,0.28)] transition-colors cursor-pointer"
              >
                <span>Lật tờ tiếp</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </div>

          {/* Album Sheet Viewport */}
          <div className="relative w-full">
            {/* Physical Stacked Album Leaves Behind Current Polaroid Sheet */}
            <div
              aria-hidden="true"
              className="hidden sm:block pointer-events-none absolute top-2 bottom-2 -right-2 w-6 rounded-r-[28px] bg-[#FFF6F8] dark:bg-[#22191D] border-y border-r border-[#F3C6D3] dark:border-[#47333A] shadow-xs -z-10"
            />
            <div
              aria-hidden="true"
              className="hidden sm:block pointer-events-none absolute top-4 bottom-4 -right-3.5 w-6 rounded-r-[28px] bg-[#FFEFF3] dark:bg-[#1E1619] border-y border-r border-[#EFC0CE] dark:border-[#3D2B31] -z-20"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-3 -bottom-2 h-5 rounded-b-[28px] bg-[#FFF8F4] dark:bg-[#22191D] border border-[#F3D1DC] dark:border-[#47333A] -z-10"
            />

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`polaroid-sheet-${selectedTag}-${safeSheetPage}`}
                initial={{
                  opacity: 0,
                  x: sheetFlipDirection >= 0 ? 32 : -32,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                exit={{
                  opacity: 0,
                  x: sheetFlipDirection >= 0 ? -24 : 24,
                }}
                transition={{
                  duration: 0.24,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {/* Album Paper Sheet with Horizontal Pan Swipe */}
                <motion.div
                  onPanEnd={handleSheetPanEnd}
                  className="relative rounded-2xl sm:rounded-[28px] bg-gradient-to-br from-[#FFFDF9] via-[#FFF9FB] to-[#FFF2F6] dark:from-[#271D21] dark:via-[#2B2024] dark:to-[#241A1E] border border-[#F5D5E0] dark:border-[#4A363D] shadow-[0_18px_45px_rgba(255,143,163,0.14)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.45)] p-4 sm:p-8 sm:pl-10 overflow-hidden touch-pan-y select-none"
                >
                  {/* Subtle Stitched Album Binding Line on Left Edge */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none hidden sm:flex flex-col justify-around items-center absolute left-2.5 top-6 bottom-6 w-2 border-r border-dashed border-[#F1C4D1] dark:border-[#5D414B] z-20"
                  />

                  {/* Polaroid Cards Grid on Current Book Sheet (2x2 Layout) */}
                  <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-7 sm:gap-9">
                    {currentSheetPhotos.map((photo, index) => {
                      const globalIndex =
                        safeSheetPage * PHOTOS_PER_SHEET + index;
                      const tiltClass =
                        index % 2 === 0 ? '-rotate-1' : 'rotate-1';
                      const TagBadgeIcon = getEmotionTagIcon(photo.emotionTag);

                      return (
                        <div key={photo.id} className="h-full">
                          <motion.article
                            initial={{ opacity: 0, y: 12 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.08 }}
                            whileHover={{ y: -4 }}
                            transition={{
                              duration: 0.25,
                              delay: Math.min(index * 0.04, 0.14),
                              ease: 'easeOut',
                            }}
                            onClick={() => openLightbox(photo)}
                            className={`group h-full bg-white dark:bg-[#312429] rounded-2xl p-4 pb-7 border border-[#F7E4EA] dark:border-[#553F47] shadow-[0_10px_30px_rgba(255,143,163,0.15)] dark:shadow-[0_14px_34px_rgba(0,0,0,0.42)] hover:shadow-[0_18px_40px_rgba(255,143,163,0.24)] dark:hover:shadow-[0_20px_44px_rgba(0,0,0,0.55)] transform ${tiltClass} hover:rotate-0 transition-shadow duration-300 cursor-pointer flex flex-col justify-between relative`}
                          >
                            {/* Decorative Patterned Washi Tape at Top */}
                            <div
                              aria-hidden="true"
                              className="w-24 h-5 bg-gradient-to-r from-[#FFE5EC]/90 via-[#FFF0F3]/95 to-[#FFE5EC]/90 dark:from-[#4F353F]/90 dark:via-[#5D3F4B]/90 dark:to-[#4F353F]/90 border border-[#F7D6E0]/80 dark:border-[#704C5A]/70 mx-auto -mt-6 mb-2.5 rounded-xs shadow-2xs flex items-center justify-center gap-1.5"
                            >
                              <span className="w-1 h-1 rounded-full bg-[#FF8FA3]/60" />
                              <span className="w-1 h-1 rounded-full bg-[#FF8FA3]/60" />
                              <span className="w-1 h-1 rounded-full bg-[#FF8FA3]/60" />
                            </div>

                            {/* Scrapbook Photo-Corner Mounts */}
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute top-3 left-3 w-3.5 h-3.5 border-t-2 border-l-2 border-[#F3C6D3] dark:border-[#7A5663] rounded-tl-xs z-20"
                            />
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute top-3 right-3 w-3.5 h-3.5 border-t-2 border-r-2 border-[#F3C6D3] dark:border-[#7A5663] rounded-tr-xs z-20"
                            />
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute bottom-3 left-3 w-3.5 h-3.5 border-b-2 border-l-2 border-[#F3C6D3]/65 dark:border-[#7A5663]/70 rounded-bl-xs z-20"
                            />
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute bottom-3 right-3 w-3.5 h-3.5 border-b-2 border-r-2 border-[#F3C6D3]/65 dark:border-[#7A5663]/70 rounded-br-xs z-20"
                            />

                            {/* Photo Frame */}
                            <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-[#FFF0F3] dark:bg-[#23191D]">
                              {!failedImages[photo.id] ? (
                                <img
                                  src={photo.imageUrl}
                                  alt={photo.caption}
                                  loading="lazy"
                                  decoding="async"
                                  draggable={false}
                                  referrerPolicy="no-referrer"
                                  onError={() =>
                                    setFailedImages((prev) => ({
                                      ...prev,
                                      [photo.id]: true,
                                    }))
                                  }
                                  className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-700 ease-out select-none"
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#FFF0F3] to-[#FFE5EC] dark:from-[#2C2025] dark:to-[#3A2930]">
                                  <Sparkles className="w-8 h-8 text-[#FF8FA3] mb-2" />
                                  <span className="text-xs font-medium text-[#7D6B6D] dark:text-[#C7B0B7]">
                                    {photo.caption}
                                  </span>
                                </div>
                              )}

                            {/* Photo Number Stamp on Top-Left */}
                            <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-white/95 dark:bg-[#22191C]/92 border border-[#F7D6E0] dark:border-[#5D414B] text-[10px] font-semibold text-[#7D6B6D] dark:text-[#F6EAEF] tabular-nums shadow-2xs">
                              #{String(globalIndex + 1).padStart(2, '0')}
                            </span>

                            {/* Corner Mini Scrapbook Sticker Badge (Static + Hover) */}
                            <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/95 dark:bg-[#22191C]/92 border border-[#F7D6E0] dark:border-[#5D414B] shadow-xs flex items-center justify-center text-[#FF8FA3] group-hover:scale-110 group-hover:rotate-12 transition-transform">
                              <TagBadgeIcon className="w-3.5 h-3.5" />
                            </div>

                            {/* Floating Hearts Overlay across Polaroid Photo Frame when liked */}
                            <AnimatePresence>
                              {heartBursts
                                .filter((b) => b.photoId === photo.id)
                                .map((burst) => (
                                  <div
                                    key={`frame-burst-${burst.id}`}
                                    className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden z-20"
                                  >
                                    <motion.div
                                      initial={{
                                        scale: 0.3,
                                        opacity: 0.95,
                                        y: 10,
                                      }}
                                      animate={{
                                        scale: [0.3, 1.35, 1.1],
                                        opacity: [0.95, 1, 0],
                                        y: -28,
                                      }}
                                      exit={{ opacity: 0 }}
                                      transition={{
                                        duration: 0.85,
                                        ease: 'easeOut',
                                      }}
                                      className="drop-shadow-[0_6px_16px_rgba(255,107,136,0.45)]"
                                    >
                                      <Heart className="w-12 h-12 fill-[#FF6B88] text-white stroke-[1.5]" />
                                    </motion.div>
                                    {FLOATING_HEART_PARTICLES.slice(0, 5).map(
                                      (p, idx) => (
                                        <motion.span
                                          key={`frame-p-${burst.id}-${idx}`}
                                          initial={{
                                            opacity: 0.95,
                                            x: 0,
                                            y: 16,
                                            scale: 0.4,
                                            rotate: 0,
                                          }}
                                          animate={{
                                            opacity: [0.95, 1, 0],
                                            x: [0, p.midX * 1.4, p.x * 1.7],
                                            y: [16, p.y * 0.55, p.y * 1.05],
                                            scale: [
                                              0.4,
                                              p.scale * 1.15,
                                              p.scale * 0.85,
                                            ],
                                            rotate: [0, p.rotate],
                                          }}
                                          transition={{
                                            duration: p.duration,
                                            delay: p.delay,
                                            ease: 'easeOut',
                                          }}
                                          style={{ color: p.color }}
                                          className="absolute"
                                        >
                                          <Heart
                                            className={`${p.size} fill-current drop-shadow-sm`}
                                          />
                                        </motion.span>
                                      )
                                    )}
                                  </div>
                                ))}
                            </AnimatePresence>

                            {/* Subtle Bottom Scrim on Hover */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-3.5">
                              <span className="text-[11px] font-medium text-white inline-flex items-center gap-1.5">
                                <Bookmark className="w-3 h-3 text-[#FFB3C1] fill-[#FFB3C1]" />
                                <span>
                                  Chạm để mở rộng & lật đọc mặt sau tấm Polaroid
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Handwritten Note Underneath Polaroid (Vietnamese-ready Mali Handwriting Font) */}
                          <div className="mt-4 pt-1 flex-1 flex flex-col justify-between">
                            <div>
                              <p
                                className="text-[15px] sm:text-base text-[#4A3B3E] dark:text-[#F6EAEF] leading-relaxed line-clamp-2"
                                style={{
                                  fontFamily:
                                    'var(--font-handwriting), var(--font-playfair), cursive',
                                }}
                              >
                                &ldquo;{photo.caption}&rdquo;
                              </p>

                              {/* Private 'Secret' Caption strictly visible ONLY to 'thanh' role */}
                              {userRole === 'thanh' && photo.secretCaption && (
                                <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-[#FFF8EA] dark:bg-[#36281D]/90 border border-dashed border-[#F0D39A] dark:border-[#6E5432] text-[11px] text-[#7A591E] dark:text-[#F3CE8A] flex items-start gap-1.5">
                                  <Lock className="w-3 h-3 text-[#C68E28] dark:text-[#F3CE8A] mt-0.5 shrink-0" />
                                  <span className="line-clamp-2">
                                    <strong>Bí mật của Anh Thành:</strong>{' '}
                                    {photo.secretCaption}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Clean Unboxed Metadata + Like Button (Zero-Pill Discipline) */}
                            <div className="mt-4 pt-3 border-t border-[#F9EBEF] dark:border-[#4A363D] flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-xs text-[#7D6B6D] dark:text-[#C7B0B7] truncate">
                                <span className="tabular-nums">
                                  {photo.date}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="text-[#D95B72] dark:text-[#FF9EB0] font-medium truncate">
                                  {photo.emotionTag}
                                </span>
                              </div>

                              <div className="relative">
                                <motion.button
                                  type="button"
                                  whileTap={{ scale: 0.82 }}
                                  onClick={(e) => handleToggleLike(e, photo)}
                                  aria-label="Thả tim cho bức ảnh"
                                  className={`inline-flex items-center gap-1.5 px-3 sm:px-2.5 py-1.5 sm:py-1 min-h-[40px] sm:min-h-0 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                                    photo.isLiked
                                      ? 'text-[#FF6B88] dark:text-[#FF9EB0] bg-[#FFF0F3] dark:bg-[#432B34] shadow-[0_2px_10px_rgba(255,107,136,0.18)]'
                                      : 'text-[#7D6B6D] dark:text-[#C7B0B7] hover:bg-[#FFF0F3] dark:hover:bg-[#3D2830] hover:text-[#FF8FA3]'
                                  }`}
                                >
                                  <motion.span
                                    key={photo.likes}
                                    initial={{ scale: 0.75 }}
                                    animate={{ scale: [1.35, 0.9, 1.1, 1] }}
                                    transition={{
                                      duration: 0.4,
                                      ease: 'easeOut',
                                    }}
                                    className="inline-flex"
                                  >
                                    <Heart
                                      className={`w-3.5 h-3.5 transition-transform ${
                                        photo.isLiked
                                          ? 'fill-[#FF6B88] text-[#FF6B88]'
                                          : ''
                                      }`}
                                    />
                                  </motion.span>
                                  <span className="tabular-nums">
                                    {photo.likes}
                                  </span>
                                </motion.button>

                                {/* Multi-Wave Floating Heart Fountain ('Tim Bay') */}
                                <AnimatePresence>
                                  {heartBursts
                                    .filter((b) => b.photoId === photo.id)
                                    .map((burst) => (
                                      <div
                                        key={`btn-burst-${burst.id}`}
                                        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-30"
                                      >
                                        {FLOATING_HEART_PARTICLES.map(
                                          (particle, i) => (
                                            <motion.span
                                              key={`${burst.id}-${i}`}
                                              initial={{
                                                opacity: 1,
                                                y: 6,
                                                x: 0,
                                                scale: 0.45,
                                                rotate: 0,
                                              }}
                                              animate={{
                                                opacity: [1, 1, 0],
                                                y: [
                                                  6,
                                                  particle.y * 0.55,
                                                  particle.y,
                                                ],
                                                x: [
                                                  0,
                                                  particle.midX,
                                                  particle.x,
                                                ],
                                                scale: [
                                                  0.45,
                                                  particle.scale,
                                                  particle.scale * 0.75,
                                                ],
                                                rotate: [
                                                  0,
                                                  particle.rotate * 0.6,
                                                  particle.rotate,
                                                ],
                                              }}
                                              exit={{ opacity: 0 }}
                                              transition={{
                                                duration: particle.duration,
                                                delay: particle.delay,
                                                ease: 'easeOut',
                                              }}
                                              style={{ color: particle.color }}
                                              className="absolute bottom-0 left-1/2 -translate-x-1/2"
                                            >
                                              <Heart
                                                className={`${particle.size} fill-current drop-shadow-[0_2px_6px_rgba(255,107,136,0.35)]`}
                                              />
                                            </motion.span>
                                          )
                                        )}
                                      </div>
                                    ))}
                                </AnimatePresence>
                              </div>
                            </div>
                          </div>
                        </motion.article>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom Bar Inside Polaroid Book Sheet */}
                  <div className="relative z-10 mt-8 pt-4 border-t border-dashed border-[#F3D1DC] dark:border-[#4A363D] flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-12 sm:pr-10">
                    <span className="text-xs text-[#7D6B6D] dark:text-[#C7B0B7] italic">
                      Đang mở tờ {String(safeSheetPage + 1).padStart(2, '0')} /{' '}
                      {String(totalSheetPages).padStart(2, '0')} · Hiển thị{' '}
                      {currentSheetPhotos.length} bức hình
                    </span>

                    {totalSheetPages > 1 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {safeSheetPage > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              flipToSheetPage(safeSheetPage - 1, -1);
                            }}
                            className="inline-flex items-center gap-1 px-3.5 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-xl bg-white dark:bg-[#312429] hover:bg-[#FFF0F3] dark:hover:bg-[#3D2C33] border border-[#F3D1DC] dark:border-[#533D45] text-xs font-semibold text-[#7D6B6D] dark:text-[#C7B0B7] hover:text-[#4A3B3E] dark:hover:text-[#F6EAEF] transition-colors cursor-pointer"
                          >
                            <ChevronLeft className="w-3.5 h-3.5 text-[#FF8FA3]" />
                            <span>Lật lại tờ {safeSheetPage}</span>
                          </button>
                        )}
                        {safeSheetPage < totalSheetPages - 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              flipToSheetPage(safeSheetPage + 1, 1);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FFF0F3] dark:bg-[#3A2930] hover:bg-[#FFE5EC] dark:hover:bg-[#49323B] border border-[#FFCCD5] dark:border-[#5D414B] text-xs font-semibold text-[#D95B72] dark:text-[#FF9EB0] transition-colors cursor-pointer"
                          >
                            <span>Sang tờ {safeSheetPage + 2}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Interactive Folded Paper Corner on Polaroid Sheet (GPU scale) */}
                  {totalSheetPages > 1 && (
                    <button
                      type="button"
                      onMouseEnter={() => setIsSheetCornerHovered(true)}
                      onMouseLeave={() => setIsSheetCornerHovered(false)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (safeSheetPage < totalSheetPages - 1) {
                          flipToSheetPage(safeSheetPage + 1, 1);
                        } else {
                          flipToSheetPage(0, -1);
                        }
                      }}
                      title={
                        safeSheetPage < totalSheetPages - 1
                          ? 'Lật sang tờ ảnh Polaroid tiếp theo'
                          : 'Lật về tờ ảnh Polaroid đầu tiên'
                      }
                      aria-label="Lật trang ảnh Polaroid"
                      className="absolute bottom-0 right-0 w-14 h-14 overflow-hidden cursor-pointer z-30"
                    >
                      <motion.div
                        animate={{
                          scale: isSheetCornerHovered ? 1.18 : 1,
                        }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        style={{ transformOrigin: 'bottom right' }}
                        className="absolute bottom-0 right-0 w-10 h-10 bg-gradient-to-tl from-[#FFE5EC] via-[#FFF0F3] to-white dark:from-[#49313A] dark:via-[#3A272F] dark:to-[#2C1F25] border-t border-l border-[#FFB3C1] dark:border-[#6A4A56] rounded-tl-2xl shadow-[-4px_-4px_12px_rgba(255,143,163,0.22)] dark:shadow-[-4px_-4px_12px_rgba(0,0,0,0.4)] flex items-end justify-end p-1.5"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-[#D95B72] dark:text-[#FF9EB0]" />
                      </motion.div>
                    </button>
                  )}
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Lightbox Detail Modal with Fast Prev/Next, Slideshow & 180° 3D Flip */}
      <AnimatePresence>
        {lightboxPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLightbox}
            className="fixed inset-0 z-50 bg-[#4A3B3E]/55 dark:bg-[#0D080A]/75 backdrop-blur-md flex items-start sm:items-center justify-center p-2.5 sm:p-6 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-[calc(0.75rem+env(safe-area-inset-bottom))] overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="my-auto bg-white/95 dark:bg-[#271D21]/92 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-[#F7D6E0] dark:border-[#4F3941] shadow-[0_25px_60px_rgba(74,59,62,0.28)] dark:shadow-[0_25px_70px_rgba(0,0,0,0.65)] max-w-4xl w-full max-h-[92dvh] overflow-y-auto md:overflow-hidden grid grid-cols-1 md:grid-cols-12 relative"
            >
              {/* Top Slideshow Progress Bar when Slideshow is active */}
              {isSlideshowPlaying && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#FFF0F3] dark:bg-[#3A2930] z-40 overflow-hidden">
                  <motion.div
                    key={`slide-progress-${lightboxPhoto.id}`}
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 4.5, ease: 'linear' }}
                    className="h-full bg-gradient-to-r from-[#FF8FA3] to-[#D95B72]"
                  />
                </div>
              )}

              {/* Left Column: High-Res Polaroid with 3D Page-Flip Between Photos & 180° Backside Flip */}
              <div className="md:col-span-7 bg-[#FFFDF9]/90 dark:bg-[#1F171A]/90 p-4 sm:p-8 flex flex-col justify-center border-b md:border-b-0 md:border-r border-[#F7E4EA] dark:border-[#4A363D] relative">
                {/* Top Mini Toolbar inside Left Column */}
                <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                  <span className="text-xs font-semibold text-[#7D6B6D] dark:text-[#C7B0B7] tabular-nums">
                    Khoảnh khắc {currentLightboxIndex + 1} /{' '}
                    {filteredPhotos.length}
                  </span>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        playPaperFlipSound();
                        setIsLightboxFlipped((prev) => !prev);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FFF0F3] dark:bg-[#3A2930] hover:bg-[#FFE5EC] dark:hover:bg-[#49323B] text-[#D95B72] dark:text-[#FF9EB0] text-xs font-semibold border border-[#FFCCD5] dark:border-[#5D414B] transition-colors cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>
                        {isLightboxFlipped
                          ? 'Lật lại mặt trước'
                          : 'Lật mặt sau ảnh (3D)'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setIsSlideshowPlaying((prev) => !prev)
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                        isSlideshowPlaying
                          ? 'bg-[#FF8FA3] dark:bg-[#E06D82] text-white border-[#FF8FA3] dark:border-[#E06D82]'
                          : 'bg-white dark:bg-[#312429] text-[#7D6B6D] dark:text-[#C7B0B7] hover:text-[#4A3B3E] dark:hover:text-[#F6EAEF] border-[#F3D1DC] dark:border-[#533D45]'
                      }`}
                    >
                      {isSlideshowPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>Tạm dừng</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Trình chiếu</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Slide + 180° Backside Flip Container for Lightbox Polaroid */}
                <div
                  className="relative w-full"
                  style={{ perspective: '1600px' }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={`lb-page-turn-${lightboxPhoto.id}`}
                      initial={{
                        opacity: 0,
                        x: lightboxFlipDir >= 0 ? 28 : -28,
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                      }}
                      exit={{
                        opacity: 0,
                        x: lightboxFlipDir >= 0 ? -24 : 24,
                      }}
                      transition={{
                        duration: 0.22,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      onPanEnd={(_e, info) => {
                        if (info.offset.x < -60 || info.velocity.x < -350) {
                          navigateLightbox('next');
                        } else if (
                          info.offset.x > 60 ||
                          info.velocity.x > 350
                        ) {
                          navigateLightbox('prev');
                        }
                      }}
                      className="w-full touch-pan-y"
                    >
                      <motion.div
                        animate={{ rotateY: isLightboxFlipped ? 180 : 0 }}
                        transition={{
                          duration: 0.38,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        style={{ transformStyle: 'preserve-3d' }}
                        className="w-full relative"
                      >
                        {/* FRONT OF LIGHTBOX POLAROID */}
                        <div
                          style={{ backfaceVisibility: 'hidden' }}
                          className="bg-white dark:bg-[#312429] p-3.5 pb-6 rounded-2xl border border-[#F3D1DC] dark:border-[#553F47] shadow-[0_10px_30px_rgba(255,143,163,0.15)] dark:shadow-[0_14px_34px_rgba(0,0,0,0.45)]"
                        >
                          <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-[#FFF0F3] dark:bg-[#23191D]">
                            {!failedImages[lightboxPhoto.id] ? (
                              <motion.img
                                key={`lb-img-${lightboxPhoto.id}`}
                                initial={{ scale: 1.04, opacity: 0.85 }}
                                animate={{
                                  scale: isSlideshowPlaying ? 1.08 : 1,
                                  opacity: 1,
                                }}
                                transition={{
                                  duration: isSlideshowPlaying ? 4.5 : 0.35,
                                  ease: 'easeOut',
                                }}
                                src={lightboxPhoto.imageUrl}
                                alt={lightboxPhoto.caption}
                                draggable={false}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover select-none"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-[#FFF0F3] dark:bg-[#2C2025] p-6 text-center">
                                <span className="text-sm text-[#7D6B6D] dark:text-[#C7B0B7]">
                                  {lightboxPhoto.caption}
                                </span>
                              </div>
                            )}

                            {/* Prev / Next Navigation Overlay Buttons */}
                            {filteredPhotos.length > 1 && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => navigateLightbox('prev')}
                                  title="Lật ảnh trước (Phím ←)"
                                  aria-label="Ảnh trước"
                                  className="absolute left-2 sm:left-2.5 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-9 sm:h-9 rounded-full bg-white/90 dark:bg-[#241A1E]/90 backdrop-blur-md hover:bg-white dark:hover:bg-[#35262C] text-[#4A3B3E] dark:text-[#F6EAEF] border border-[#F3D1DC] dark:border-[#5D414B] shadow-sm flex items-center justify-center transition-transform hover:scale-105 cursor-pointer z-20"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => navigateLightbox('next')}
                                  title="Lật ảnh tiếp theo (Phím →)"
                                  aria-label="Ảnh tiếp theo"
                                  className="absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-9 sm:h-9 rounded-full bg-white/90 dark:bg-[#241A1E]/90 backdrop-blur-md hover:bg-white dark:hover:bg-[#35262C] text-[#4A3B3E] dark:text-[#F6EAEF] border border-[#F3D1DC] dark:border-[#5D414B] shadow-sm flex items-center justify-center transition-transform hover:scale-105 cursor-pointer z-20"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            {/* Floating Hearts Overlay inside Lightbox Photo */}
                            <AnimatePresence>
                              {heartBursts
                                .filter((b) => b.photoId === lightboxPhoto.id)
                                .map((burst) => (
                                  <div
                                    key={`lightbox-frame-burst-${burst.id}`}
                                    className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden z-20"
                                  >
                                    <motion.div
                                      initial={{
                                        scale: 0.3,
                                        opacity: 0.95,
                                        y: 10,
                                      }}
                                      animate={{
                                        scale: [0.3, 1.4, 1.15],
                                        opacity: [0.95, 1, 0],
                                        y: -32,
                                      }}
                                      exit={{ opacity: 0 }}
                                      transition={{
                                        duration: 0.9,
                                        ease: 'easeOut',
                                      }}
                                      className="drop-shadow-[0_8px_20px_rgba(255,107,136,0.45)]"
                                    >
                                      <Heart className="w-14 h-14 fill-[#FF6B88] text-white stroke-[1.5]" />
                                    </motion.div>
                                  </div>
                                ))}
                            </AnimatePresence>
                          </div>
                          <p
                            className="mt-4 text-center text-base text-[#4A3B3E] dark:text-[#F6EAEF]"
                            style={{
                              fontFamily:
                                'var(--font-handwriting), var(--font-playfair), cursive',
                            }}
                          >
                            &ldquo;{lightboxPhoto.caption}&rdquo;
                          </p>
                        </div>

                        {/* BACK OF LIGHTBOX POLAROID (Handwritten Postcard Back) */}
                        <div
                          style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                          }}
                          className="absolute inset-0 bg-[#FFFDF9] dark:bg-[#2E2227] p-4 sm:p-8 rounded-2xl border border-[#FFB3C1] dark:border-[#6A4A56] shadow-[0_10px_30px_rgba(255,143,163,0.18)] dark:shadow-[0_16px_38px_rgba(0,0,0,0.48)] flex flex-col justify-between overflow-y-auto"
                        >
                          <div>
                            <div className="flex items-center justify-between pb-3 border-b border-dashed border-[#F3D1DC] dark:border-[#533D45]">
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D95B72] dark:text-[#FF9EB0]">
                                <Feather className="w-3.5 h-3.5 text-[#FF8FA3]" />
                                <span>Mặt sau tấm hình Polaroid</span>
                              </span>
                              <span className="text-xs text-[#7D6B6D] dark:text-[#C7B0B7] tabular-nums">
                                {lightboxPhoto.date}
                              </span>
                            </div>

                            <p
                              className="mt-4 sm:mt-5 text-[15px] sm:text-base text-[#4A3B3E] dark:text-[#F6EAEF] leading-relaxed"
                              style={{
                                fontFamily:
                                  'var(--font-handwriting), var(--font-playfair), cursive',
                              }}
                            >
                              &ldquo;{lightboxPhoto.story}&rdquo;
                            </p>
                          </div>

                          <div className="pt-3 mt-3 border-t border-dashed border-[#F3D1DC] dark:border-[#533D45] flex items-center justify-between text-xs text-[#7D6B6D] dark:text-[#C7B0B7] gap-2">
                            <span>— Viết bởi {senderAlias}</span>
                            <button
                              type="button"
                              onClick={() => {
                                playPaperFlipSound();
                                setIsLightboxFlipped(false);
                              }}
                              className="text-[#D95B72] dark:text-[#FF9EB0] font-semibold hover:underline cursor-pointer min-h-[40px] sm:min-h-0 inline-flex items-center"
                            >
                              Lật lại mặt ảnh →
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Right Column: Story & Controls */}
              <div className="md:col-span-5 p-4 sm:p-8 flex flex-col justify-between bg-white dark:bg-[#271D21] md:max-h-[92dvh] md:overflow-y-auto">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-1.5 text-xs text-[#7D6B6D] dark:text-[#C7B0B7]">
                      <span className="tabular-nums">{lightboxPhoto.date}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#D95B72] dark:text-[#FF9EB0] font-medium">
                        {lightboxPhoto.emotionTag}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={closeLightbox}
                      aria-label="Đóng cửa sổ xem ảnh"
                      className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 rounded-xl text-[#7D6B6D] dark:text-[#C7B0B7] hover:text-[#4A3B3E] dark:hover:text-[#F6EAEF] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2930] transition-colors cursor-pointer inline-flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {!isEditingLightbox ? (
                    <>
                      <h3
                        className="text-xl font-semibold text-[#4A3B3E] dark:text-[#F6EAEF] mb-3"
                        style={{ fontFamily: 'var(--font-playfair), serif' }}
                      >
                        Lời Nhắn Từ {senderAlias}
                      </h3>
                      <p className="text-sm text-[#7D6B6D] dark:text-[#C7B0B7] leading-relaxed whitespace-pre-line">
                        {lightboxPhoto.story}
                      </p>

                      {userRole === 'thanh' && (
                        <div className="mt-5 p-3.5 rounded-2xl bg-[#FFF8EA] dark:bg-[#36281D]/90 border border-dashed border-[#F0D39A] dark:border-[#6E5432]">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#9C6B19] dark:text-[#F3CE8A] mb-1">
                            <Lock className="w-3.5 h-3.5 text-[#C68E28] dark:text-[#F3CE8A]" />
                            <span>Ghi chú bí mật (Chỉ Anh Thành thấy)</span>
                          </div>
                          <p className="text-xs text-[#6B501C] dark:text-[#EAD2A2] leading-relaxed whitespace-pre-line">
                            {lightboxPhoto.secretCaption?.trim() ||
                              'Chưa có ghi chú bí mật cho bức ảnh này. Bấm "Sửa lời nhắn" bên dưới để ghi lại suy nghĩ riêng của bạn.'}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-[#4A3B3E] dark:text-[#F6EAEF] mb-1">
                          Dòng chữ viết tay dưới ảnh
                        </label>
                        <input
                          type="text"
                          value={editCaption}
                          onChange={(e) => setEditCaption(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-[#FFFDF9] dark:bg-[#1E161A] border border-[#F3D1DC] dark:border-[#533D45] text-base sm:text-sm text-[#4A3B3E] dark:text-[#F6EAEF] focus:outline-none focus:border-[#FF8FA3]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#4A3B3E] dark:text-[#F6EAEF] mb-1">
                          Câu chuyện đằng sau bức ảnh
                        </label>
                        <textarea
                          rows={4}
                          value={editStory}
                          onChange={(e) => setEditStory(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-[#FFFDF9] dark:bg-[#1E161A] border border-[#F3D1DC] dark:border-[#533D45] text-base sm:text-sm text-[#4A3B3E] dark:text-[#F6EAEF] focus:outline-none focus:border-[#FF8FA3]"
                        />
                      </div>
                      {userRole === 'thanh' && (
                        <div>
                          <label className="flex items-center gap-1.5 text-xs font-medium text-[#9C6B19] dark:text-[#F3CE8A] mb-1">
                            <Lock className="w-3.5 h-3.5 text-[#C68E28] dark:text-[#F3CE8A]" />
                            <span>Ghi chú bí mật của Anh Thành (ẩn với em)</span>
                          </label>
                          <textarea
                            rows={2}
                            value={editSecretCaption}
                            onChange={(e) => setEditSecretCaption(e.target.value)}
                            placeholder="Ghi chú riêng cho tấm ảnh này (chỉ hiển thị khi đăng nhập tài khoản Anh Thành)..."
                            className="w-full px-3.5 py-2 rounded-xl border border-[#F0D39A] dark:border-[#6E5432] bg-[#FFFDF7] dark:bg-[#36281D]/90 text-base sm:text-xs text-[#4A3B3E] dark:text-[#F6EAEF] focus:outline-none focus:border-[#C68E28]"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-medium text-[#4A3B3E] dark:text-[#F6EAEF] mb-1">
                          Chủ đề cảm xúc
                        </label>
                        <select
                          value={editTag}
                          onChange={(e) => setEditTag(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-[#F3D1DC] dark:border-[#533D45] text-base sm:text-sm text-[#4A3B3E] dark:text-[#F6EAEF] bg-white dark:bg-[#1E161A] focus:outline-none focus:border-[#FF8FA3]"
                        >
                          {EMOTION_TAGS.filter((t) => t !== 'Tất cả').map((tag) => (
                            <option key={tag} value={tag}>
                              {tag}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleSaveLightboxEdit}
                          className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FF8FA3] dark:bg-[#E06D82] text-white text-xs font-medium hover:bg-[#FF7A91] dark:hover:bg-[#CE5D72] cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Lưu thay đổi</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingLightbox(false)}
                          className="px-3.5 py-2 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FFF0F3] dark:bg-[#3A2930] text-[#7D6B6D] dark:text-[#C7B0B7] text-xs font-medium cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Actions inside Lightbox */}
                <div className="mt-8 pt-4 border-t border-[#F7E4EA] dark:border-[#4A363D] flex items-center justify-between gap-2 flex-wrap">
                  <div className="relative">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.86 }}
                      onClick={(e) => handleToggleLike(e, lightboxPhoto)}
                      className={`inline-flex items-center gap-2 px-4 py-2 min-h-[44px] sm:min-h-0 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                        lightboxPhoto.isLiked
                          ? 'bg-[#FFF0F3] dark:bg-[#432B34] text-[#FF6B88] dark:text-[#FF9EB0] shadow-[0_2px_12px_rgba(255,107,136,0.18)]'
                          : 'bg-[#FFFDF9] dark:bg-[#312429] border border-[#F3D1DC] dark:border-[#533D45] text-[#7D6B6D] dark:text-[#C7B0B7]'
                      }`}
                    >
                      <motion.span
                        key={lightboxPhoto.likes}
                        initial={{ scale: 0.75 }}
                        animate={{ scale: [1.35, 0.9, 1.1, 1] }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className="inline-flex"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            lightboxPhoto.isLiked ? 'fill-[#FF6B88] text-[#FF6B88] dark:fill-[#FF9EB0] dark:text-[#FF9EB0]' : ''
                          }`}
                        />
                      </motion.span>
                      <span className="tabular-nums">
                        {lightboxPhoto.likes} lượt yêu thích
                      </span>
                    </motion.button>

                    {/* Floating Heart Burst Particles inside Lightbox */}
                    <AnimatePresence>
                      {heartBursts
                        .filter((b) => b.photoId === lightboxPhoto.id)
                        .map((burst) => (
                          <div
                            key={`lightbox-btn-burst-${burst.id}`}
                            className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-30"
                          >
                            {FLOATING_HEART_PARTICLES.map((particle, i) => (
                              <motion.span
                                key={`lb-${burst.id}-${i}`}
                                initial={{
                                  opacity: 1,
                                  y: 6,
                                  x: 0,
                                  scale: 0.45,
                                  rotate: 0,
                                }}
                                animate={{
                                  opacity: [1, 1, 0],
                                  y: [6, particle.y * 0.55, particle.y],
                                  x: [0, particle.midX, particle.x],
                                  scale: [0.45, particle.scale, particle.scale * 0.75],
                                  rotate: [0, particle.rotate * 0.6, particle.rotate],
                                }}
                                exit={{ opacity: 0 }}
                                transition={{
                                  duration: particle.duration,
                                  delay: particle.delay,
                                  ease: 'easeOut',
                                }}
                                style={{ color: particle.color }}
                                className="absolute bottom-0 left-1/2 -translate-x-1/2"
                              >
                                <Heart
                                  className={`${particle.size} fill-current drop-shadow-[0_2px_6px_rgba(255,107,136,0.35)]`}
                                />
                              </motion.span>
                            ))}
                          </div>
                        ))}
                    </AnimatePresence>
                  </div>

                  {/* Edit & Delete strictly limited to Admin/Setup role */}
                  {userRole === 'thanh' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingLightbox(!isEditingLightbox)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FFFDF9] dark:bg-[#312429] hover:bg-[#FFF0F3] dark:hover:bg-[#3D2C33] border border-[#F3D1DC] dark:border-[#533D45] text-xs font-medium text-[#4A3B3E] dark:text-[#F6EAEF] transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5 text-[#FF8FA3]" />
                        <span>Sửa lời nhắn</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(lightboxPhoto.id)}
                        title="Xóa ảnh này"
                        className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 rounded-xl bg-[#FFF0F3] dark:bg-[#432B34] hover:bg-[#FFE5EC] dark:hover:bg-[#52343F] text-[#C94A63] dark:text-[#FF9EB0] transition-colors cursor-pointer inline-flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload & Live Polaroid Preview Modal (Strictly for Admin role 'thanh') */}
      <AnimatePresence>
        {isUploadModalOpen && userRole === 'thanh' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsUploadModalOpen(false)}
            className="fixed inset-0 z-50 bg-[#4A3B3E]/55 dark:bg-[#0D080A]/75 backdrop-blur-md flex items-start sm:items-center justify-center p-2.5 sm:p-6 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-[calc(0.75rem+env(safe-area-inset-bottom))] overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="my-auto bg-white/95 dark:bg-[#271D21]/92 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-[#F7D6E0] dark:border-[#4F3941] shadow-[0_25px_60px_rgba(74,59,62,0.28)] dark:shadow-[0_25px_70px_rgba(0,0,0,0.65)] max-w-4xl w-full max-h-[92dvh] overflow-y-auto p-4 sm:p-8"
            >
              <div className="flex items-center justify-between gap-4 mb-5 sm:mb-6">
                <div>
                  <p className="text-xs text-[#7D6B6D] dark:text-[#C7B0B7]">
                    Chế độ chuẩn bị quà · Tự động tối ưu chất lượng ảnh
                  </p>
                  <h3
                    className="text-lg sm:text-2xl font-semibold text-[#4A3B3E] dark:text-[#F6EAEF]"
                    style={{ fontFamily: 'var(--font-playfair), serif' }}
                  >
                    Tải Ảnh Polaroid Mới Dành Cho Quỳnh Anh
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 rounded-xl text-[#7D6B6D] dark:text-[#C7B0B7] hover:text-[#4A3B3E] dark:hover:text-[#F6EAEF] hover:bg-[#FFF0F3] dark:hover:bg-[#3A2930] transition-colors cursor-pointer inline-flex items-center justify-center shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={handleUploadSubmit}
                className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start"
              >
                {/* Left Column: Live Polaroid Frame Preview */}
                <div className="md:col-span-5 flex flex-col items-center">
                  <div className="w-full max-w-xs bg-white dark:bg-[#312429] rounded-2xl p-4 pb-7 border border-[#F3D1DC] dark:border-[#553F47] shadow-[0_10px_30px_rgba(255,143,163,0.18)] dark:shadow-[0_14px_34px_rgba(0,0,0,0.45)] -rotate-1">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        processSelectedFiles(e.dataTransfer.files);
                      }}
                      className={`w-full aspect-[4/3] rounded-xl overflow-hidden flex flex-col items-center justify-center cursor-pointer border-2 border-dashed transition-colors ${
                        isDragging
                          ? 'border-[#FF8FA3] bg-[#FFE5EC]/50 dark:bg-[#49323B]/60'
                          : 'border-[#F3D1DC] dark:border-[#5D414B] bg-[#FFF0F3]/60 dark:bg-[#23191D]/70 hover:bg-[#FFF0F3] dark:hover:bg-[#2F2127]'
                      }`}
                    >
                      {previewFiles.length > 0 ? (
                        <img
                          src={previewFiles[0]}
                          alt="Xem trước ảnh Polaroid"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="p-4 text-center">
                          <Upload className="w-7 h-7 text-[#FF8FA3] mx-auto mb-2" />
                          <p className="text-xs font-medium text-[#4A3B3E] dark:text-[#F6EAEF]">
                            Chạm để chọn ảnh hoặc kéo thả vào đây
                          </p>
                          <p className="text-[11px] text-[#7D6B6D] dark:text-[#C7B0B7] mt-1">
                            Hỗ trợ chọn một hoặc nhiều bức ảnh cùng lúc
                          </p>
                        </div>
                      )}
                    </div>

                    <p
                      className="mt-4 text-sm text-[#4A3B3E] dark:text-[#F6EAEF] text-center line-clamp-2 min-h-[2.5rem]"
                      style={{
                        fontFamily:
                          'var(--font-handwriting), var(--font-playfair), cursive',
                      }}
                    >
                      &ldquo;
                      {uploadCaption.trim() ||
                        'Lời nhắn viết tay sẽ hiện ngay dưới khung ảnh này...'}
                      &rdquo;
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-[#F9EBEF] dark:border-[#4A363D] flex items-center justify-between text-[11px] text-[#7D6B6D] dark:text-[#C7B0B7]">
                      <span className="tabular-nums">{uploadDate}</span>
                      <span className="text-[#D95B72] dark:text-[#FF9EB0] font-medium">{uploadTag}</span>
                    </div>
                  </div>

                  {previewFiles.length > 1 && (
                    <p className="mt-3 text-xs text-[#D95B72] dark:text-[#FF9EB0] font-medium">
                      Đã chọn {previewFiles.length} bức ảnh để đăng cùng lúc
                    </p>
                  )}
                </div>

                {/* Right Column: Form Controls */}
                <div className="md:col-span-7 space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => processSelectedFiles(e.target.files)}
                    className="hidden"
                  />

                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FFF0F3] dark:bg-[#3A2930] hover:bg-[#FFE5EC] dark:hover:bg-[#49323B] text-[#D95B72] dark:text-[#FF9EB0] text-xs font-medium transition-colors cursor-pointer"
                    >
                      {previewFiles.length > 0
                        ? 'Chọn thêm ảnh khác'
                        : 'Chọn ảnh từ thiết bị'}
                    </button>
                    {previewFiles.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setPreviewFiles([])}
                        className="px-3 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl text-xs text-[#7D6B6D] dark:text-[#C7B0B7] hover:text-[#4A3B3E] dark:hover:text-[#F6EAEF] cursor-pointer"
                      >
                        Xóa ảnh đã chọn
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#4A3B3E] dark:text-[#F6EAEF] mb-1.5">
                      Lời nhắn viết tay dưới đáy ảnh dành cho Quỳnh Anh
                    </label>
                    <input
                      type="text"
                      value={uploadCaption}
                      onChange={(e) => setUploadCaption(e.target.value)}
                      placeholder="Ví dụ: Giữa một chiều ngập nắng, nụ cười này làm người đối diện cũng thấy bình yên..."
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FFFDF9] dark:bg-[#1E161A] border border-[#F3D1DC] dark:border-[#533D45] text-base sm:text-sm text-[#4A3B3E] dark:text-[#F6EAEF] placeholder-[#B39EA1] dark:placeholder-[#9A8189] focus:outline-none focus:border-[#FF8FA3]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#4A3B3E] dark:text-[#F6EAEF] mb-1.5">
                        Ngày lưu niệm
                      </label>
                      <input
                        type="text"
                        value={uploadDate}
                        onChange={(e) => setUploadDate(e.target.value)}
                        placeholder="14.03.2026"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#FFFDF9] dark:bg-[#1E161A] border border-[#F3D1DC] dark:border-[#533D45] text-base sm:text-sm text-[#4A3B3E] dark:text-[#F6EAEF] tabular-nums focus:outline-none focus:border-[#FF8FA3]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#4A3B3E] dark:text-[#F6EAEF] mb-1.5">
                        Tag cảm xúc
                      </label>
                      <select
                        value={uploadTag}
                        onChange={(e) => setUploadTag(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#FFFDF9] dark:bg-[#1E161A] border border-[#F3D1DC] dark:border-[#533D45] text-base sm:text-sm text-[#4A3B3E] dark:text-[#F6EAEF] focus:outline-none focus:border-[#FF8FA3]"
                      >
                        {EMOTION_TAGS.filter((t) => t !== 'Tất cả').map((tag) => (
                          <option key={tag} value={tag}>
                            {tag}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#4A3B3E] dark:text-[#F6EAEF] mb-1.5">
                      Ghi chú chi tiết phía sau bức ảnh (hiển thị khi Quỳnh Anh bấm vào ảnh)
                    </label>
                    <textarea
                      rows={3}
                      value={uploadStory}
                      onChange={(e) => setUploadStory(e.target.value)}
                      placeholder="Viết vài dòng tinh tế để mỗi khi Quỳnh Anh bấm vào bức ảnh sẽ đọc được..."
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FFFDF9] dark:bg-[#1E161A] border border-[#F3D1DC] dark:border-[#533D45] text-base sm:text-sm text-[#4A3B3E] dark:text-[#F6EAEF] placeholder-[#B39EA1] dark:placeholder-[#9A8189] focus:outline-none focus:border-[#FF8FA3]"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-[#9C6B19] dark:text-[#F3CE8A] mb-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#C68E28] dark:text-[#F3CE8A]" />
                      <span>Ghi chú bí mật của Anh Thành (Chỉ hiển thị cho tài khoản Anh Thành)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={uploadSecretCaption}
                      onChange={(e) => setUploadSecretCaption(e.target.value)}
                      placeholder="Ghi chú riêng tư của bạn cho khoảnh khắc này (sẽ được ẩn hoàn toàn trên trang của em)..."
                      className="w-full px-4 py-2 rounded-xl bg-[#FFFDF7] dark:bg-[#36281D]/90 border border-[#F0D39A] dark:border-[#6E5432] text-base sm:text-xs text-[#4A3B3E] dark:text-[#F6EAEF] placeholder-[#B39EA1] dark:placeholder-[#9A8189] focus:outline-none focus:border-[#C68E28]"
                    />
                  </div>

                  <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setIsUploadModalOpen(false)}
                      className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FFFDF9] dark:bg-[#312429] border border-[#F3D1DC] dark:border-[#533D45] text-xs font-medium text-[#7D6B6D] dark:text-[#C7B0B7] cursor-pointer"
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      disabled={previewFiles.length === 0 || isCompressing}
                      className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-[#FF8FA3] hover:bg-[#FF7A91] dark:bg-[#E06D82] dark:hover:bg-[#CE5D72] disabled:opacity-50 text-white text-xs font-medium shadow-[0_8px_20px_rgba(255,143,163,0.28)] transition-all cursor-pointer"
                    >
                      {isCompressing
                        ? 'Đang tối ưu ảnh...'
                        : 'Đồng Bộ Lên Tường Ảnh'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
