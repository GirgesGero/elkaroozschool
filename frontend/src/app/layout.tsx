import type { Metadata, Viewport } from 'next';
import { Cairo } from 'next/font/google';
import Image from 'next/image';
import './globals.css';
import Providers from './providers';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';

/**
 * Self-hosted via next/font instead of an @import in globals.css.
 *
 * WHY: the old CSS @import of Google Fonts was render-blocking, and worse,
 * Tailwind's `font-sans` utility on <body> overrode the stylesheet — so the
 * Arabic face never actually rendered and the app fell back to a different
 * system font on every device. next/font preloads, self-hosts (no third-party
 * request on first paint), and exposes --font-cairo for globals.css.
 *
 * `adjustFontFallback` reduces the layout shift while the font swaps in.
 */
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-cairo',
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: 'مدرسة الكاروز للكتاب المقدس',
  description: 'المنصة التعليمية والإدارية المتكاملة لمدرسة الكاروز للكتاب المقدس - كنيسة مار مرقس الرسول بالمنشية',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'الكاروز سكول',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  // Matches the flagship navy/gold theme. Was '#7B0017', a crimson that no
  // active theme uses — the browser chrome disagreed with the app.
  themeColor: '#0B1324',
  width: 'device-width',
  initialScale: 1,
  // Zoom is NOT disabled. `maximumScale: 1, userScalable: false` breaks
  // WCAG 1.4.4 (Resize Text) and blocks pinch-zoom for low-vision users.
  // iOS ignores userScalable anyway, so this had no upside and real harm.
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      {/* No `font-sans` here — it is what previously defeated the Arabic font.
          No `selection:*` here either — ::selection is themed in globals.css. */}
      <body className="min-h-screen antialiased">
        <Providers>
          <ServiceWorkerRegistration />
          {/* Global Ambient Brand Watermark */}
          <div
            aria-hidden="true"
            className="fixed inset-0 z-10 flex items-center justify-center overflow-hidden opacity-[0.035] pointer-events-none select-none"
          >
            <div className="relative w-[500px] h-[500px] sm:w-[680px] sm:h-[680px] lg:w-[850px] lg:h-[850px]">
              <Image
                src="/logo.png"
                alt=""
                fill
                sizes="(max-width: 640px) 500px, (max-width: 1024px) 680px, 850px"
                className="object-contain"
              />
            </div>
          </div>
          <div className="relative z-[1] min-h-screen flex flex-col">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
