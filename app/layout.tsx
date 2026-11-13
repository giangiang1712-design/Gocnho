import type { Metadata, Viewport } from 'next';
import {
  Playfair_Display,
  Plus_Jakarta_Sans,
  Mali,
} from 'next/font/google';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin', 'vietnamese'],
  weight: ['500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
});

const mali = Mali({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-handwriting',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Góc Nhỏ Chữa Lành',
  description:
    'Không gian sổ lưu niệm Polaroid ấm áp và Trạm Lắng Nghe dành tặng riêng cho Quỳnh Anh.',
  openGraph: {
    title: 'Góc Nhỏ Chữa Lành',
    description:
      'Không gian sổ lưu niệm Polaroid ấm áp và Trạm Lắng Nghe dành tặng riêng cho Quỳnh Anh.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Góc Nhỏ Chữa Lành',
    description:
      'Không gian sổ lưu niệm Polaroid ấm áp và Trạm Lắng Nghe dành tặng riêng cho Quỳnh Anh.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${playfair.variable} ${jakarta.variable} ${mali.variable}`}
    >
      <body
        suppressHydrationWarning
        className={`${jakarta.className} min-h-[100dvh] overflow-x-clip bg-[#FFFDF9] dark:bg-[#1B1417] text-[#4A3B3E] dark:text-[#F6EAEF] antialiased selection:bg-[#FFE5EC] dark:selection:bg-[#4F323C] selection:text-[#4A3B3E] dark:selection:text-[#FFF0F3] transition-colors duration-500`}
      >
        {children}
      </body>
    </html>
  );
}
