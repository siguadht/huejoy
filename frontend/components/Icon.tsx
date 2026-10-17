// 雀跃 HueJoy 图标 registry —— 由 P0 原型 svg symbol 一比一迁移（viewBox 0 0 24 24）
// 生成来源：brand-preview/*.html 的 <symbol> 定义；stroke/fill 默认值与原型 .ic 类一致

import type { CSSProperties, ReactElement } from "react";

const P: Record<string, ReactElement> = {
  /* ---- 提示类（P2 新增：原型未定义，notice/notice-error 警告条使用） ---- */
  'alert': (
    <>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
    </>
  ),
  'arrow-down': (
    <>
      <path d="M12 5v14M19 12l-7 7-7-7"/>
    </>
  ),
  'arrow-right': (
    <>
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </>
  ),
  'arrow-up': (
    <>
      <path d="M12 19V5M5 12l7-7 7 7"/>
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 10-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M10.3 21a2 2 0 003.4 0"/>
    </>
  ),
  book: (
    <>
      <path d="M12 6.5C10 4.8 7.2 4.5 4 5v13c3.2-.5 6-.2 8 1.5 2-1.7 4.8-2 8-1.5V5c-3.2-.5-6-.2-8 1.5z"/><path d="M12 6.5v13"/>
    </>
  ),
  bookmark: (
    <>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </>
  ),
  camera: (
    <>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
    </>
  ),
  cap: (
    <>
      <path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12.5V17c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5"/><path d="M22 10v6"/>
    </>
  ),
  check: (
    <>
      <path d="M20 6 9 17l-5-5"/>
    </>
  ),
  'chevron-down': (
    <>
      <path d="M6 9l6 6 6-6"/>
    </>
  ),
  'chevron-left': (
    <>
      <path d="M15 6l-6 6 6 6"/>
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>
    </>
  ),
  coffee: (
    <>
      <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z"/><path d="M6 1v3M10 1v3M14 1v3"/>
    </>
  ),
  film: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="2.18"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5"/>
    </>
  ),
  folder: (
    <>
      <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    </>
  ),
  gamepad: (
    <>
      <path d="M6 11h4M8 9v4M15 12h.01M18 10h.01"/><rect x="2" y="6" width="20" height="12" rx="5"/>
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 2.6 4 5.6 4 9s-1.2 6.4-4 9c-2.8-2.6-4-5.6-4-9s1.2-6.4 4-9z"/>
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>
    </>
  ),
  heart: (
    <>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </>
  ),
  home: (
    <>
      <path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.8V20a1 1 0 001 1h12a1 1 0 001-1V9.8"/><path d="M10 21v-6h4v6"/>
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M4 18l5-5 3.5 3.5L16 13l4 4"/>
    </>
  ),
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </>
  ),
  'map-pin': (
    <>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </>
  ),
  megaphone: (
    <>
      <path d="M3 11v3l4 .8L9 20h2.5L10 15.2 21 19V5z"/><path d="M7 14.5V9.5"/>
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>
    </>
  ),
  music: (
    <>
      <path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>
    </>
  ),
  package: (
    <>
      <path d="M16.5 9.4 7.55 4.24M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>
    </>
  ),
  panel: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9.5 4v16"/>
    </>
  ),
  pause: (
    <>
      <rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none"/>
    </>
  ),
  play: (
    <>
      <path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14"/>
    </>
  ),
  refresh: (
    <>
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>
    </>
  ),
  repeat: (
    <>
      <path d="M17 2l4 4-4 4"/><path d="M3 12v-2a4 4 0 014-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 12v2a4 4 0 01-4 4H3"/>
    </>
  ),
  scissors: (
    <>
      <circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M8.2 7.6L20 18M8.2 16.4L20 6"/>
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </>
  ),
  shuffle: (
    <>
      <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
    </>
  ),
  smile: (
    <>
      <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01" strokeWidth="2.6"/>
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.9 2.6L22.5 18.5l-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9z"/>
    </>
  ),
  star: (
    <>
      <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"/>
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 20h16"/>
    </>
  ),
  user: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </>
  ),
  video: (
    <>
      <rect x="3" y="6" width="12" height="12" rx="3"/><path d="M15 10.5l6-3.5v10l-6-3.5"/>
    </>
  ),
  wand: (
    <>
      <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5"/>
    </>
  ),
  zap: (
    <>
      <path d="M13 2L4 14h6l-1 8 9-12h-6z"/>
    </>
  ),

  /* ---- 侧边栏专用图标（原型 sidebar 内联路径，与 sprite 版略有差异，保持原视觉） ---- */
  'nav-sparkles': (
    <>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.9 2.6L22.5 18.5l-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9z"/>
    </>
  ),
  'nav-folder': (
    <>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>
    </>
  ),
  'nav-casino': (
    <>
      <rect x="3" y="7" width="14" height="12" rx="3"/><path d="M17 8.5l3.5 1.8-3.5 1.8"/><path d="M7.5 12h.01M12 12h.01M16.5 12h.01" strokeWidth="2.4"/>
    </>
  ),
  'nav-forge': (
    <>
      <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z"/><path d="M5 16l.8 2.2L8 19l-2.2.8L5 22l-.8-2.2L2 19l2.2-.8z"/><path d="M18.5 14l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z"/>
    </>
  ),
};

export type IconName = keyof typeof P;

export function Icon({ name, className, style }: { name: IconName; className?: string; style?: CSSProperties }) {
  return (
    <svg className={className ?? "ic"} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {P[name]}
    </svg>
  );
}