'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { Icon, type IconName } from '@/components/Icon';

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  live?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

/** 侧边栏四组导航（与 P0 原型 v0.9++ 一致） */
const NAV: NavGroup[] = [
  {
    label: '创作',
    items: [
      { href: '/', label: '创作台', icon: 'nav-sparkles' },
      { href: '/skills', label: '技能库', icon: 'grid' },
    ],
  },
  {
    label: '资产',
    items: [
      { href: '/projects', label: '项目库', icon: 'nav-folder' },
      { href: '/waiting', label: '等待中', icon: 'clock', live: true },
    ],
  },
  {
    label: '关于',
    items: [
      { href: '/brand', label: '品牌定稿', icon: 'star' },
      { href: '/settings', label: '设置', icon: 'settings' },
    ],
  },
];

/** 原型约定：工作台是创作台的聚焦模式，落在 /studio 时侧栏激活「创作台」 */
const ACTIVE_MAP: Record<string, string> = { '/studio': '/' };

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() || '/';
  const current = ACTIVE_MAP[pathname] || pathname;

  const isActive = (href: string) => {
    if (href === '/') return current === '/';
    return current === href || current.startsWith(href + '/');
  };

  return (
    <aside className="sidebar">
      <Link className="brand" href="/" onClick={onNavigate}>
        <BrandLogo />
        雀<span className="accent">跃</span> <span className="en">HueJoy</span>
      </Link>
      <nav className="side-nav">
        {NAV.map((group) => (
          <div key={group.label}>
            <div className="glabel">{group.label}</div>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={isActive(item.href) ? 'active' : undefined}
                onClick={onNavigate}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.live && <em className="live-dot" />}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="side-foot">
        <button className="side-user" type="button">
          <div className="avatar">朕</div>
          <div className="uinfo">
            <span className="uname">朕</span>
            <span className="uplan">免费版 · 今日剩 3 次</span>
          </div>
        </button>
      </div>
    </aside>
  );
}
