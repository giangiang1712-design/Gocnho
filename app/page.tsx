'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Heart } from 'lucide-react';

const ScrapbookWorkspace = dynamic(
  () => import('@/components/ScrapbookWorkspace'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center p-6">
        <div className="text-center">
          <Heart className="w-8 h-8 text-[#FF8FA3] fill-[#FF8FA3] mx-auto mb-3" />
          <p
            className="text-lg text-[#4A3B3E]"
            style={{ fontFamily: 'var(--font-playfair), serif' }}
          >
            Đang mở Góc Nhỏ Chữa Lành...
          </p>
        </div>
      </div>
    ),
  }
);

export default function HomePage() {
  return <ScrapbookWorkspace />;
}
