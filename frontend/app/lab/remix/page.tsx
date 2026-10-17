'use client';

import { useState } from 'react';
import { Icon } from '@/components/Icon';

interface Stage {
  name: string;
  time: number;
  cost: number;
}

const STAGES: Stage[] = [
  { name: '剧本策划', time: 6, cost: 1.2 },
  { name: '角色设计', time: 3, cost: 0.9 },
  { name: '场景设计', time: 2, cost: 0.6 },
  { name: '分镜规划', time: 4, cost: 1.0 },
  { name: '参考图', time: 3, cost: 0.8 },
  { name: '视频生成', time: 24, cost: 8.3 },
];

const FULL_TIME = STAGES.reduce((s, x) => s + x.time, 0);
const FULL_COST = STAGES.reduce((s, x) => s + x.cost, 0);

interface ChildWork {
  title: string;
  tag: string;
  tagCls: string;
  cover: string;
  meta: string;
  diff: Array<[string, string]>;
}

const CHILDREN: ChildWork[] = [
  {
    title: '柴犬版',
    tag: '已完成',
    tagCls: 'tag-green',
    cover: 'linear-gradient(135deg,#B9A8F0,#6E56CF)',
    meta: '36 分钟 · ¥11.60 · 比全量省 ¥8.70',
    diff: [
      ['角色：橘猫→柴犬', 'tag-purple'],
      ['其余 5 阶段保留', 'tag-gray'],
    ],
  },
  {
    title: '末日地堡版',
    tag: '生成中 62%',
    tagCls: 'tag-blue',
    cover: 'linear-gradient(135deg,#9BD4FF,#3AA7F5)',
    meta: '33 分钟 · ¥10.70 · 已跑 20 分钟',
    diff: [
      ['场景：成都老街→末日地堡', 'tag-blue'],
      ['剧本/角色保留', 'tag-gray'],
    ],
  },
  {
    title: '重剪版',
    tag: '已完成',
    tagCls: 'tag-green',
    cover: 'linear-gradient(135deg,#C7B8F5,#8B5CF6)',
    meta: '9 分钟 · ¥3.10 · 只重生 3 镜',
    diff: [
      ['镜 2/5/7 重画', 'tag-purple'],
      ['其余 5 镜原片', 'tag-gray'],
    ],
  },
];

export default function RemixPage() {
  const [picked, setPicked] = useState(3);
  const [shotLevel, setShotLevel] = useState(true);

  let t = 0;
  let c = 0;
  for (let i = picked; i < STAGES.length; i++) {
    t += STAGES[i].time;
    c += STAGES[i].cost;
  }
  let note = '';
  if (shotLevel && picked === 3) {
    t = 4 + 3 + 2;
    c = 1.0 + 3 * 0.9;
    note = '分镜规划全跑 · 仅重生 3 镜（其余 5 镜原片）';
  } else if (shotLevel && picked > 3) {
    t = STAGES[picked].time;
    c = STAGES[picked].cost;
    note = '仅重生改动的镜头';
  } else {
    note = `重跑 ${6 - picked} 个阶段 · 保留 ${picked} 个阶段产物`;
  }

  const activeBranch: 'char' | 'scene' | 'board' | null =
    picked === 1 ? 'char' : picked === 2 ? 'scene' : picked === 3 ? 'board' : null;

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <div className="page-head">
        <h1>
          Remix 工作台{' '}
          <span className="tag tag-purple" style={{ marginLeft: 8, verticalAlign: 4 }}>
            <Icon name="sparkles" className="ic ic-sm" />
            结构化解构
          </span>
        </h1>
        <div className="sub">
          小云雀的 6 阶段产物全是结构化数据——换主角、换场景、改一个分镜，都只重跑需要的阶段，前面的成果原样保留。这是「一条道走到黑」的生成器做不到的事。
        </div>
      </div>

      <div className="remix-grid">
        <div className="card tree-card">
          <div className="section-title" style={{ margin: '0 0 6px' }}>
            <h2>作品谱系树</h2>
            <span className="more">点分支卡片可联动右侧沙盘</span>
          </div>
          <svg viewBox="0 0 580 372">
            <path d="M176 186 C 268 186, 296 70, 392 70" stroke="#DBDBDB" strokeWidth="2" fill="none" />
            <path d="M176 186 L 392 186" stroke="#DBDBDB" strokeWidth="2" />
            <path d="M176 186 C 268 186, 296 302, 392 302" stroke="#DBDBDB" strokeWidth="2" fill="none" />
            <text x="262" y="118" fontSize="10.5" fill="#1F8A5B" textAnchor="middle">
              省 31min · ¥8.70
            </text>
            <text x="262" y="172" fontSize="10.5" fill="#1F8A5B" textAnchor="middle">
              省 24min · ¥6.10
            </text>
            <text x="262" y="256" fontSize="10.5" fill="#1F8A5B" textAnchor="middle">
              省 33min · ¥9.70
            </text>

            <rect x="14" y="150" width="162" height="72" rx="14" fill="#171717" />
            <text x="95" y="180" fill="#FFF" fontSize="14.5" fontWeight="600" textAnchor="middle">
              橘猫便利店
            </text>
            <text x="95" y="202" fill="#ADADAD" fontSize="10.5" textAnchor="middle">
              v1 · 已发布 · 全量 42min ¥12.80
            </text>

            <g
              className={`branch${activeBranch === 'char' ? ' active' : ''}`}
              data-stage="1"
              onClick={() => setPicked(1)}
              style={{ cursor: 'pointer' }}
            >
              <rect x="392" y="36" width="174" height="70" rx="14" fill="#FFF" stroke="#DBDBDB" strokeWidth="1.5" />
              <text x="408" y="62" fontSize="13.5" fontWeight="600" fill="#171717">
                柴犬版 · 换主角
              </text>
              <text x="408" y="82" fontSize="10.5" fill="#6F6F6F">
                从「角色设计」起重跑 · 36min ¥11.60
              </text>
              <text x="408" y="96" className="b-tag" fontSize="10.5" fill="#6D3FD4">
                剧本/场景/镜头全部保留
              </text>
            </g>

            <g
              className={`branch${activeBranch === 'scene' ? ' active' : ''}`}
              data-stage="2"
              onClick={() => setPicked(2)}
              style={{ cursor: 'pointer' }}
            >
              <rect x="392" y="152" width="174" height="70" rx="14" fill="#FFF" stroke="#DBDBDB" strokeWidth="1.5" />
              <text x="408" y="178" fontSize="13.5" fontWeight="600" fill="#171717">
                末日地堡版 · 换场景
              </text>
              <text x="408" y="198" fontSize="10.5" fill="#6F6F6F">
                从「场景设计」起重跑 · 33min ¥10.70
              </text>
              <text x="408" y="212" className="b-tag" fontSize="10.5" fill="#6D3FD4">
                剧本/角色保留 · 生成中 62%
              </text>
            </g>

            <g
              className={`branch${activeBranch === 'board' ? ' active' : ''}`}
              data-stage="3"
              onClick={() => setPicked(3)}
              style={{ cursor: 'pointer' }}
            >
              <rect x="392" y="268" width="174" height="70" rx="14" fill="#FFF" stroke="#DBDBDB" strokeWidth="1.5" />
              <text x="408" y="294" fontSize="13.5" fontWeight="600" fill="#171717">
                重剪版 · 改 3 个镜头
              </text>
              <text x="408" y="314" fontSize="10.5" fill="#6F6F6F">
                分镜起重跑 + 镜头级重生 · 9min ¥3.10
              </text>
              <text x="408" y="328" className="b-tag" fontSize="10.5" fill="#6D3FD4">
                只重生改动的 3 镜，其余 5 镜原片保留
              </text>
            </g>
          </svg>
        </div>

        <div className="card sandbox">
          <div className="section-title" style={{ margin: '0 0 10px' }}>
            <h2>阶段重跑沙盘</h2>
            <span className="more">选从哪一阶段开始</span>
          </div>
          <div className="save-note">
            <Icon name="check" className="ic ic-sm" style={{ flex: 'none', marginTop: 2 }} />
            <span>
              选中阶段<b>之前</b>的产物原样保留（不重复计费）；选中阶段<b>起</b>向后重跑。谱系树会同步高亮对应分支。
            </span>
          </div>

          <div>
            {STAGES.map((s, i) => {
              const cls = i === picked ? 'rerun picked' : i < picked ? 'keep' : 'rerun';
              const lock =
                i < picked ? (
                  <span className="lock">
                    <Icon name="lock" style={{ width: 12, height: 12 }} />
                    保留
                  </span>
                ) : null;
              return (
                <div key={s.name} className={`stage-row ${cls}`} onClick={() => setPicked(i)}>
                  <span className="no">{i + 1}</span>
                  <span className="nm">{s.name}</span>
                  {lock}
                  <span className="est">
                    {s.time}min · ¥{s.cost.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="shot-toggle" style={{ display: picked >= 3 ? 'flex' : 'none' }}>
            <span
              className={`switch${shotLevel ? ' on' : ''}`}
              onClick={() => setShotLevel((s) => !s)}
            />
            <span>
              <b>镜头级重生</b>
              <br />
              <span className="sub">分镜改了 3 镜 → 只重生这 3 镜（¥0.9/镜），其余 5 镜原片保留</span>
            </span>
          </div>

          <div className="estimate">
            <div className="row">
              <span className="big">{t} 分钟</span>
              <span style={{ fontSize: 13, color: '#C9C9C9' }}>·</span>
              <span className="big" style={{ fontSize: 22 }}>
                ¥{c.toFixed(2)}
              </span>
              <span className="vs">
                全量重跑 <s>{FULL_TIME}min ¥{FULL_COST.toFixed(2)}</s>
              </span>
            </div>
            <div className="break">
              <span>
                <Icon name="clock" style={{ width: 12, height: 12, verticalAlign: -2 }} /> 预计 {t} 分钟
              </span>
              <span>保留 {picked} 个阶段产物</span>
              <span>{note}</span>
              <span style={{ color: '#8FE3B8' }}>
                省 {FULL_TIME - t}min · ¥{(FULL_COST - c).toFixed(2)}
              </span>
            </div>
            <div className="acts">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ background: '#fff', color: '#171717' }}
              >
                <Icon name="refresh" className="ic ic-sm" />
                开始 Remix
              </button>
              <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#C9C9C9' }}>
                <Icon name="scissors" className="ic ic-sm" />
                对比原片
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="section-title">
        <h2>Remix 子作品</h2>
        <span className="more">全部复用原项目的结构化产物，不是重新生成</span>
      </div>
      <div className="grid grid-3">
        {CHILDREN.map((ch) => (
          <div className="card child-card" key={ch.title}>
            <div className="child-cover" style={{ background: ch.cover }}>
              <span className="play">
                <Icon name="play" style={{ width: 16, height: 16 }} />
              </span>
            </div>
            <h4>
              {ch.title} <span className={`tag ${ch.tagCls}`}>{ch.tag}</span>
            </h4>
            <div className="meta">{ch.meta}</div>
            <div className="diff">
              {ch.diff.map(([text, cls]) => (
                <span key={text} className={`tag ${cls}`}>
                  {text}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
