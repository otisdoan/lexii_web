import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Lexii TOEIC® - Luyện thi TOEIC hiệu quả",
  description: "Ứng dụng luyện thi TOEIC thông minh với đầy đủ bài thi thử, luyện nghe, đọc, viết, nói và kiến thức ngữ pháp, từ vựng.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" style={{ colorScheme: 'light' }}>
      <body className={`${lexend.variable} antialiased font-sans`}>
        {children}
      </body>
    </html>
  );
}
