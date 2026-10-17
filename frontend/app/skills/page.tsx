'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { Icon, type IconName } from '@/components/Icon';
import { SKILLS, type Skill } from '@/data/skills';

type TabKey = 'all' | Skill['scene'];

/** 场景 tab（用户视角：想干什么 → 进哪堆技能） */
const SCENE_TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'blockbuster', label: '大片制作' },
  { key: 'commerce', label: '带货变现' },
  { key: 'daily', label: '内容日更' },
  { key: 'memory', label: '情感记录' },
  { key: 'play', label: '创意玩法' },
];

/** 主打技能：头部横宽卡 + 大号图标砖卡（身份色即视觉标识） */
const FEATURED = ['short-film', 'song-mv', 'audio-picture-book', 'motion-transfer', 'digital-human'];

function SkillFlow({ steps }: { steps: string[] }) {
  return (
    <div className="flow">
      {steps.map((step, i) => (
        <Fragment key={i}>
          {i > 0 && <Icon name="arrow-right" className="ic ic-sm" />}
          {i === 0 || i === steps.length - 1 ? <b>{step}</b> : <span>{step}</span>}
        </Fragment>
      ))}
    </div>
  );
}

export default function SkillsPage() {
  const [tab, setTab] = useState<TabKey>('all');
  const [kw, setKw] = useState('');

  const keyword = kw.trim().toLowerCase();
  const match = (s: Skill) =>
    !keyword || (s.name + s.desc + s.flow.join('') + s.meta).toLowerCase().includes(keyword);

  const scoped = SKILLS.filter((s) => (tab === 'all' || s.scene === tab) && match(s));
  const showFeatured = tab === 'all' && !keyword;

  const featuredList = FEATURED.map((slug) => SKILLS.find((s) => s.slug === slug)).filter(
    (s): s is Skill => Boolean(s)
  );
  const hero = featuredList[0];
  const featuredRest = featuredList.slice(1);
  const tools = showFeatured ? scoped.filter((s) => !FEATURED.includes(s.slug)) : scoped;

  return (
    <div>
      <div className="page-head skills-toolbar">
        <div>
          <h1>技能库</h1>
          <p className="sub">每个技能都是一条成熟的生产线——选定技能，喂给它素材，它负责成片。</p>
        </div>
        <input
          className="skills-search"
          type="search"
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          placeholder="描述你想做什么，自动匹配技能"
          aria-label="搜索技能"
        />
      </div>

      <div className="tabs" role="tablist">
        {SCENE_TABS.map((t) => {
          const count =
            t.key === 'all' ? SKILLS.length : SKILLS.filter((s) => s.scene === t.key).length;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`tab${tab === t.key ? ' active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label} <span className="n">{count}</span>
            </button>
          );
        })}
      </div>

      {showFeatured && hero && (
        <>
          <div className="section-label">
            主打技能 <span className="n">{featuredList.length} 条 · 最成熟的生产线</span>
          </div>
          <Link className="skill-hero" href={hero.href}>
            <div className="skill-hero-body">
              <div className="skill-tile skill-tile-lg" style={{ background: hero.tile.bg, color: hero.tile.color }}>
                <Icon name={hero.icon} />
              </div>
              <h3>
                {hero.name}
                {hero.badge && <span className={`tag ${hero.badge.cls}`}>{hero.badge.text}</span>}
              </h3>
              <p className="desc">{hero.desc}</p>
              <SkillFlow steps={hero.flow} />
              <div className="meta">
                <Icon name="clock" className="ic ic-sm" />
                {hero.meta}
              </div>
              <span className="skill-hero-cta">
                进入工作台
                <Icon name="arrow-right" className="ic ic-sm" />
              </span>
            </div>
          </Link>

          <div className="grid grid-2">
            {featuredRest.map((skill) => (
              <Link key={skill.slug} className="skill-card" href={skill.href}>
                <div className="skill-tile" style={{ background: skill.tile.bg, color: skill.tile.color }}>
                  <Icon name={skill.icon} />
                </div>
                <h3>{skill.name}</h3>
                <p className="desc">{skill.desc}</p>
                <SkillFlow steps={skill.flow} />
                <div className="meta">
                  <Icon name="clock" className="ic ic-sm" />
                  {skill.meta}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="section-label">
        {showFeatured ? '更多工具' : '技能'}
        <span className="n">{tools.length} 条</span>
      </div>

      {tools.length > 0 ? (
        <div className="grid grid-3">
          {tools.map((skill) => (
            <Link key={skill.slug} className="skill-card" href={skill.href}>
              <div className="skill-tile" style={{ background: skill.tile.bg, color: skill.tile.color }}>
                <Icon name={skill.icon} />
              </div>
              <h3>{skill.name}</h3>
              <p className="desc">{skill.desc}</p>
              <SkillFlow steps={skill.flow} />
              <div className="meta">
                <Icon name="clock" className="ic ic-sm" />
                {skill.meta}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="notice">
          <Icon name="sparkles" className="ic" />
          <p>没有匹配「{kw}」的技能——换个说法试试，或者到「全部」里逛逛。</p>
        </div>
      )}

      <div className="notice">
        <Icon name="sparkles" className="ic" />
        <p><b>技能是可插拔的。</b>所有技能跑在统一的生产线框架上（任务队列 + 进度事件 + 产物登记），后端新增一条 pipeline、前端加一张卡片即完成上线——这是把「更多 skill」做成产品能力而不是一次性功能的关键。当前 {SKILLS.length} 条技能已全部接入后端真实生产。</p>
      </div>
    </div>
  );
}
