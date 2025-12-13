import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
// #region agent log
try {
  fetch('http://127.0.0.1:7242/ingest/3488d827-43aa-4265-9c85-a4d1c8210adf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'layout.tsx:3',message:'Importing ThemeProvider',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
} catch(e) {}
// #endregion
import { ThemeProvider } from "../contexts/ThemeContext";
// #region agent log
try {
  fetch('http://127.0.0.1:7242/ingest/3488d827-43aa-4265-9c85-a4d1c8210adf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'layout.tsx:4',message:'Importing Header',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
} catch(e) {}
// #endregion
import { Header } from "../components/layout";
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
    default: "CLIMATE SWITCH - 경기도 기후 시뮬레이터",
    template: "%s | CLIMATE SWITCH",
  },
  description: "경기 기후위성 데이터와 공간정보를 활용하여 도시 요소를 ON/OFF 했을 때 폭염·침수 위험이 어떻게 변하는지 즉시 시각화하고 정량화하는 체험형 지도 서비스",
  keywords: ["기후", "시뮬레이터", "폭염", "침수", "경기도", "지도", "기후변화", "도시계획", "환경"],
  authors: [{ name: "CLIMATE SWITCH Team" }],
  creator: "CLIMATE SWITCH",
  publisher: "CLIMATE SWITCH",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: siteUrl,
    siteName: "CLIMATE SWITCH",
    title: "CLIMATE SWITCH - 경기도 기후 시뮬레이터",
    description: "도시 요소를 ON/OFF하며 폭염·침수 위험 변화를 시각화하는 체험형 기후 시뮬레이터",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CLIMATE SWITCH - 경기도 기후 시뮬레이터",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CLIMATE SWITCH - 경기도 기후 시뮬레이터",
    description: "도시 요소를 ON/OFF하며 폭염·침수 위험 변화를 시각화하는 체험형 기후 시뮬레이터",
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
  // #region agent log
  try {
    if (typeof window === 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/3488d827-43aa-4265-9c85-a4d1c8210adf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'layout.tsx:79',message:'RootLayout rendering (server)',data:{hasChildren:!!children,hasThemeProvider:typeof ThemeProvider !== 'undefined',hasHeader:typeof Header !== 'undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    } else {
      fetch('http://127.0.0.1:7242/ingest/3488d827-43aa-4265-9c85-a4d1c8210adf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'layout.tsx:79',message:'RootLayout rendering (client)',data:{hasChildren:!!children,pathname:window.location.pathname,hasThemeProvider:typeof ThemeProvider !== 'undefined',hasHeader:typeof Header !== 'undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    }
  } catch(e) {
    fetch('http://127.0.0.1:7242/ingest/3488d827-43aa-4265-9c85-a4d1c8210adf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'layout.tsx:79',message:'RootLayout error',data:{error:String(e)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  }
  // #endregion
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${notoSansKR.variable} antialiased`}>
        <ThemeProvider>
          {/* 스킵 네비게이션 - 접근성 */}
          <a
            href="#main-content"
            className="skip-link"
          >
            본문으로 바로가기
          </a>
          <Header />
          <main id="main-content">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
