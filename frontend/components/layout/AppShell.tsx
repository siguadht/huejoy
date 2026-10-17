'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { SKILLS } from '@/data/skills';

/** 路由 → 顶栏面包屑分段（与 P0 原型各页 crumb 一致） */
function crumbPartsFor(pathname: string): string[] {
  const skillMatch = pathname.match(/^\/skills\/([^/]+)$/);
  if (skillMatch) {
    const skill = SKILLS.find((s) => s.slug === skillMatch[1]);
    return ['技能库', skill ? skill.name : '技能详情'];
  }
  const table: Array<[RegExp, string[]]> = [
    [/^\/lab\/casino/, ['创作台', '灵感赌场']],
    [/^\/lab\/asset-forge/, ['创作台', '资产车间']],
    [/^\/lab\/remix/, ['项目库', '橘猫便利店', 'Remix 工作台']],
    [/^\/skills$/, ['技能库']],
    [/^\/studio$/, ['创作台', '主流程工作台']],
    [/^\/projects$/, ['项目库']],
    [/^\/waiting$/, ['等待中', '橘猫便利店']],
    [/^\/brand$/, ['品牌定稿']],
    [/^\/settings$/, ['设置']],
    [/^\/$/, ['创作台']],
  ];
  for (const [re, parts] of table) {
    if (re.test(pathname)) return parts;
  }
  return ['创作台'];
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const [collapsed, setCollapsed] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  // 折叠态持久化（桌面 240→68px）
  useEffect(() => {
    if (window.localStorage.getItem('huejoy-sidebar-collapsed') === '1') {
      setCollapsed(true);
    }
  }, []);

  // 路由变化即关移动抽屉
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  // 抽屉打开时：锁背景滚动 + Esc 关闭
  useEffect(() => {
    if (!navOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [navOpen]);

  const toggleNav = () => {
    if (window.matchMedia('(max-width: 960px)').matches) {
      setNavOpen((v) => !v);
    } else {
      setCollapsed((v) => {
        const next = !v;
        window.localStorage.setItem('huejoy-sidebar-collapsed', next ? '1' : '0');
        return next;
      });
    }
  };

  return (
    <div className={`app-shell${collapsed ? ' collapsed' : ''}${navOpen ? ' nav-open' : ''}`}>
      {/* 移动端抽屉遮罩：点按关闭 */}
      {navOpen && <div className="nav-scrim" onClick={() => setNavOpen(false)} aria-hidden />}
      <Sidebar onNavigate={() => setNavOpen(false)} />
      <div className="app-main">
        <TopBar parts={crumbPartsFor(pathname)} onNavToggle={toggleNav} />
        <main className="container">{children}</main>
        <footer className="footer">
          <span>雀跃 HueJoy · 灵感一跳，即成片</span>
          <span>后端生产线：小云雀 FilmAgent（MIT）· 保留上游版权声明</span>
        </footer>
      </div>
    </div>
  );
}
