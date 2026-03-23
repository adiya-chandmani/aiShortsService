import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { ThemeProvider } from "../contexts/ThemeContext";
import { ProviderSettingsProvider } from "../contexts/ProviderSettingsContext";
import { FanCutStudioProvider } from "../contexts/FanCutStudioContext";
import { AppShell } from "../components/layout/AppShell";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-kr",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://climate-switch.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "FanCut AI - IP 기반 숏폼 제작 스튜디오",
    template: "%s | FanCut AI",
  },
  description: "아이디어 한 줄로 플롯부터 이미지·영상까지 이어서 15~30초 숏폼을 완성하는 AI 창작 도구(데모)",
  keywords: ["AI", "숏폼", "팬콘텐츠", "2차창작", "스토리보드", "플롯", "이미지 생성", "영상 생성", "FanCut", "FanCut AI"],
  authors: [{ name: "FanCut AI Team" }],
  creator: "FanCut AI",
  publisher: "FanCut AI",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: siteUrl,
    siteName: "FanCut AI",
    title: "FanCut AI - IP 기반 숏폼 제작 스튜디오",
    description: "아이디어 한 줄로 플롯 → 이미지 → 영상 → 렌더까지 이어지는 숏폼 제작 플로우",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "FanCut AI - 숏폼 제작 스튜디오",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FanCut AI - IP 기반 숏폼 제작 스튜디오",
    description: "아이디어 한 줄로 플롯 → 이미지 → 영상 → 렌더까지",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${notoSansKR.variable} antialiased`}>
        <ThemeProvider>
          <ProviderSettingsProvider>
            <FanCutStudioProvider>
              <AppShell>{children}</AppShell>
            </FanCutStudioProvider>
          </ProviderSettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
