import "./globals.css";

export const metadata = {
  title: "이음(EUM) — 문화예술교육 수요·공급 연결 지도",
  description: "ARTE 공공데이터 기반 문화예술교육 사각지대 진단·연계 플랫폼",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
