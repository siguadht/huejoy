import { Fragment } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/Icon';

/** 窄版顶栏：折叠钮 + 面包屑 + 右侧操作（与 P0 原型 v0.8 一致）
 *  单层页面（首页/技能库/项目库等）不渲染 crumb——侧栏激活项已标明位置，避免同词一高一低挂两处
 *  多层页面（如 技能库 / 歌曲MV）保留面包屑，提供回上层导航 */
export function TopBar({ parts, onNavToggle }: { parts: string[]; onNavToggle: () => void }) {
  return (
    <header className="topbar">
      <button className="icon-btn" type="button" onClick={onNavToggle} title="收起/展开侧栏" aria-label="收起/展开侧栏">
        <Icon name="panel" />
      </button>
      {parts.length > 1 && (
        <div className="crumb">
          {parts.map((part, i) => (
            <Fragment key={i}>
              {i > 0 && <span className="sep">/</span>}
              <span className={i < parts.length - 1 ? 'sep' : 'cur'}>{part}</span>
            </Fragment>
          ))}
        </div>
      )}
      <div className="spacer" />
      <Link className="btn btn-primary topbar-cta" href="/?compose=1">
        <Icon name="plus" className="ic ic-sm" />开拍
      </Link>
      <Link className="icon-btn" href="/settings" title="设置" aria-label="设置">
        <Icon name="settings" />
      </Link>
      <div className="avatar">朕</div>
    </header>
  );
}
