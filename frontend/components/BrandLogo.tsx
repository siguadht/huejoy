// 雀跃 HueJoy 品牌 Logo「跃雀」—— 墨黑容器 + 上跃白雀 + 雀紫点睛（品牌符号解禁单点彩色）
// 与 P0 原型 6 页顶栏/侧栏内联 SVG 一比一一致
export function BrandLogo({ className = "logo-mark" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden>
      <rect x="5" y="5" width="38" height="38" rx="11" fill="#171717" />
      <path d="M13 34 Q22 25 33 16.5 Q36.5 14 35.5 19 Q33.5 27.5 24.5 31.5 Q17.5 34.5 13 34 Z" fill="#FFF" />
      <path d="M26 23.5 Q29.5 14.5 38 10.5 Q34.5 19.5 30 26.5 Z" fill="#FFF" opacity=".8" />
      <path d="M14 32.5 L7 37 L15.5 35 Z" fill="#FFF" opacity=".72" />
      <circle cx="33.6" cy="18.4" r="1.5" fill="#8B5CF6" />
      <path d="M9 39.5 Q15.5 42 22 40.5" stroke="#FFF" strokeWidth="1.8" fill="none" opacity=".38" strokeLinecap="round" />
      <path d="M12.5 41.5 Q17 43 22.5 42" stroke="#FFF" strokeWidth="1.3" fill="none" opacity=".22" strokeLinecap="round" />
      <circle cx="29.5" cy="36.5" r="1.4" fill="#8B5CF6" opacity=".9" />
      <circle cx="25" cy="39.5" r="1" fill="#8B5CF6" opacity=".55" />
    </svg>
  );
}
