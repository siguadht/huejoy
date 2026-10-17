'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon, type IconName } from '@/components/Icon';
import { SKILLS } from '@/data/skills';
import { PROJECTS } from '@/data/projects';
import {
  deriveSessionStatus,
  isSessionActive,
  sessionProgress,
  sessionStageName,
  sessionTitle,
} from '@/lib/sessionDisplay';
import { useAutoRefresh } from '@/lib/useAutoRefresh';
import {
  fetchHealth,
  fetchPipelineTasks,
  fetchSessions,
  pickDefaultModels,
  startProject,
  type PipelineTask,
} from '@/lib/workflowApi';

const IDEA_CHIPS = [
  '暴雨夜的便利店，猫和加班青年',
  '猫咪总裁的一天',
  '国风武侠 15 秒预告',
  '新品咖啡豆开箱短片',
];

const STYLE_OPTIONS = ['写实', '动画', '治愈', '国风', '赛博'];
const EPISODE_OPTIONS = [1, 2, 4, 8];
const RATIO_OPTIONS = ['16:9', '9:16', '1:1'];

/** pipeline id → 技能展示名 / 图标 / 技能页 slug（与项目库一致） */
const PIPELINE_META: Record<string, { label: string; icon: IconName; slug: string }> = {
  standard: { label: '艺术短片', icon: 'film', slug: 'art-short-video' },
  digital_human: { label: '数字人口播', icon: 'user', slug: 'digital-human' },
  action_transfer: { label: '动作迁移', icon: 'refresh', slug: 'motion-transfer' },
};

const TASK_COVERS = [
  'linear-gradient(135deg,#C7B8F5,#8B5CF6)',
  'linear-gradient(135deg,#A8E6CF,#1FA98C)',
  'linear-gradient(135deg,#9BD4FF,#3AA7F5)',
];

/** 首页「进行中的项目」统一卡片模型 */
interface ActiveItem {
  key: string;
  name: string;
  statusLabel: string;
  statusCls: string;
  meta: string;
  progress: number;
  live: boolean;
  cover: string;
  icon: IconName;
  href: string;
  action: string;
  sortTs: number;
}

export default function HomePage() {
  const router = useRouter();
  const [idea, setIdea] = useState('');
  const [styleIdx, setStyleIdx] = useState(0);
  const [episodeIdx, setEpisodeIdx] = useState(2);
  const [ratioIdx, setRatioIdx] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [backendUp, setBackendUp] = useState<boolean | null>(null);
  const [activeItems, setActiveItems] = useState<ActiveItem[]>([]);
  const [activeLoaded, setActiveLoaded] = useState(false);

  const featuredSkills = SKILLS.slice(0, 7);
  const runningProjects = PROJECTS.filter((p) => p.status === '生成中' || p.status === '待确认');

  /* 后端健康探测：不可达时给出诚实提示，不再假装能生成 */
  useEffect(() => {
    let alive = true;
    fetchHealth().then((ok) => {
      if (alive) setBackendUp(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  /* 顶栏「开拍」入口：?compose=1 落地后聚焦灵感输入框 */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.location.search.includes('compose=1')) return;
    const t = setTimeout(() => {
      document.getElementById('ideaInput')?.focus();
      window.history.replaceState(null, '', window.location.pathname);
    }, 250);
    return () => clearTimeout(t);
  }, []);

  /* 进行中的项目：真实会话（running/waiting）+ 运行中技能任务，时间倒序 */
  const loadActive = useCallback(async () => {
    try {
      const [sessions, tasks] = await Promise.all([fetchSessions(), fetchPipelineTasks()]);
      const items: ActiveItem[] = [];
      sessions.filter(isSessionActive).forEach((s: any) => {
        const st = deriveSessionStatus(s.status ?? {});
        items.push({
          key: `session:${s.id}`,
          name: sessionTitle(s),
          statusLabel: st.label,
          statusCls: st.cls,
          meta: `短片创作 · ${sessionStageName(s)}`,
          progress: sessionProgress(s),
          live: st.label === '生成中',
          cover: 'linear-gradient(135deg,#B9A8F0,#6E56CF)',
          icon: 'film',
          href: `/waiting?session=${s.id}`,
          action: st.label === '待确认' ? '去确认' : '进入',
          sortTs: s.date ?? 0,
        });
      });
      tasks
        .filter((t) => t.status === 'running' || t.status === 'pending')
        .forEach((t, i) => {
          const pm = PIPELINE_META[t.pipeline] ?? { label: t.pipeline, icon: 'zap' as IconName, slug: 'skills' };
          const ts = t.created_at ? new Date(t.created_at).getTime() / 1000 : 0;
          items.push({
            key: `task:${t.task_id}`,
            name: t.input?.title || t.input?.idea || `${pm.label}任务`,
            statusLabel: t.status === 'running' ? '生成中' : '排队中',
            statusCls: t.status === 'running' ? 'tag-blue' : 'tag-gray',
            meta: pm.label,
            progress: typeof t.progress === 'number' ? t.progress : 0,
            live: t.status === 'running',
            cover: TASK_COVERS[i % TASK_COVERS.length],
            icon: pm.icon,
            href: `/skills/${pm.slug}`,
            action: '进入',
            sortTs: Number.isNaN(ts) ? 0 : ts,
          });
        });
      setActiveItems(items.sort((a, b) => b.sortTs - a.sortTs));
    } catch {
      setActiveItems([]);
    } finally {
      setActiveLoaded(true);
    }
  }, []);

  /* 实时刷新：有活跃项 4s 静默轮询；无则 60s 轻轮询；后端不可达时停轮询；页面隐藏自动暂停 */
  useAutoRefresh(loadActive, {
    intervalMs: activeItems.length > 0 ? 4000 : 60000,
    enabled: backendUp !== false,
  });

  /* 提交：创建真实会话 → 跳等待页真实模式 */
  const handleStart = async () => {
    const text = idea.trim();
    if (!text) {
      document.getElementById('ideaInput')?.focus();
      return;
    }
    if (submitting) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      const models = await pickDefaultModels();
      if (!models) {
        setSubmitError('模型未配置：请先在设置页填入 API Key 并选择默认模型，再开始创作。');
        return;
      }
      const { session_id } = await startProject({
        idea: text,
        style: STYLE_OPTIONS[styleIdx],
        episodes: EPISODE_OPTIONS[episodeIdx],
        video_ratio: RATIO_OPTIONS[ratioIdx],
        ...models,
      });
      router.push(`/waiting?session=${session_id}`);
    } catch (err) {
      setSubmitError(
        `${err instanceof Error ? err.message : '创建会话失败'}。可先以演示模式体验等待页，或去设置页检查后端配置。`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {backendUp === false && (
        <div className="notice" style={{ marginBottom: 16 }}>
          <Icon name="alert" className="ic ic-sm" />
          后端未连接：创作台当前以演示模式运行。启动后端后即可真实生成（启动方式见设置页）。
        </div>
      )}

      <section className="composer-zone">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
        <svg className="leap-arc" style={{ top: -12, right: '4%' }} width="180" height="90" viewBox="0 0 180 90">
          <path d="M12 78 Q60 86 108 66" stroke="#8B5CF6" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".4" />
          <path d="M33 85 Q78 90 123 75" stroke="#8B5CF6" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity=".22" />
          <circle cx="144" cy="50" r="4" fill="#8B5CF6" opacity=".85" />
          <circle cx="132" cy="65" r="2.6" fill="#A78BFA" opacity=".6" />
          <circle cx="158" cy="66" r="2" fill="#8B5CF6" opacity=".45" />
          <circle cx="120" cy="80" r="1.6" fill="#A78BFA" opacity=".5" />
        </svg>
        <div className="hero-badge"><span className="hero-badge-dot" />雀跃 HueJoy · 六阶段 AI 导演流水线</div>
        <h1>今天想<span className="brand-word">拍什么</span>？</h1>
        <p className="sub">说一句话，剩下的交给导演组</p>
        <div className="composer">
          <textarea
            id="ideaInput"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="例如：一只橘猫在雨夜便利店门口等人的短片，分 4 集，风格要治愈一点……"
          />
          <div className="bar">
            <button className="opt" type="button">
              <Icon name="upload" className="ic ic-sm" />上传素材
            </button>
            <button className="opt" type="button" onClick={() => setStyleIdx((i) => (i + 1) % STYLE_OPTIONS.length)}>
              风格：{STYLE_OPTIONS[styleIdx]} ▾
            </button>
            <button className="opt" type="button" onClick={() => setEpisodeIdx((i) => (i + 1) % EPISODE_OPTIONS.length)}>
              集数：{EPISODE_OPTIONS[episodeIdx]} ▾
            </button>
            <button className="opt" type="button" onClick={() => setRatioIdx((i) => (i + 1) % RATIO_OPTIONS.length)}>
              比例：{RATIO_OPTIONS[ratioIdx]} ▾
            </button>
            <button className="btn btn-primary go" type="button" onClick={handleStart} disabled={submitting}>
              {submitting ? '创建中…' : '开始创作'}
              {!submitting && <Icon name="arrow-right" className="ic ic-sm" />}
            </button>
          </div>
        </div>
        {submitError && (
          <div className="notice notice-error" style={{ marginTop: 12 }}>
            <Icon name="alert" className="ic ic-sm" />
            <span>
              {submitError}
              <Link href="/settings" style={{ marginLeft: 8, textDecoration: 'underline' }}>去设置</Link>
              <Link href="/waiting" style={{ marginLeft: 8, textDecoration: 'underline' }}>演示模式</Link>
            </span>
          </div>
        )}
        <div className="chips">
          <span style={{ fontSize: 13, color: 'var(--text-3)', alignSelf: 'center' }}>没灵感？试试：</span>
          {IDEA_CHIPS.map((chip) => (
            <button
              key={chip}
              className="chip"
              type="button"
              onClick={() => {
                setIdea(chip + '，拍一个有电影感的短片');
                document.getElementById('ideaInput')?.focus();
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      </section>

      <div className="section-title">
        <h2>选个技能开拍</h2>
        <Link className="more" href="/skills">全部 {SKILLS.length} 个技能 →</Link>
      </div>
      <div className="grid grid-4">
        {featuredSkills.map((skill) => (
          <Link key={skill.slug} className="skill-card" href={skill.href}>
            <div className="skill-tile" style={{ background: skill.tile.bg, color: skill.tile.color }}>
              <Icon name={skill.icon} />
            </div>
            <h3>
              {skill.name}
              {skill.badge && <span className={`tag ${skill.badge.cls} badge-new`}>{skill.badge.text}</span>}
            </h3>
            <p className="desc">{skill.desc}</p>
            <div className="meta">
              <Icon name="clock" className="ic ic-sm" />
              {skill.meta}
            </div>
          </Link>
        ))}
        <Link className="skill-card" href="/skills" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderStyle: 'dashed' }}>
          <div className="skill-tile" style={{ background: 'var(--surface-2)', color: 'var(--text-2)', marginBottom: 10 }}>
            <Icon name="grid" />
          </div>
          <h3 style={{ justifyContent: 'center' }}>全部技能</h3>
          <p className="desc" style={{ minHeight: 'auto' }}>去技能库看看 {SKILLS.length} 条生产线</p>
        </Link>
      </div>

      <div className="section-title">
        <h2>进行中的项目</h2>
        <Link className="more" href="/projects">项目库 →</Link>
      </div>
      <div className="grid grid-2">
        {/* 后端不可达：演示数据兜底（顶部已有诚实提示条） */}
        {backendUp === false && runningProjects.map((project) => (
          <div key={project.id} className="card proj-card hoverable">
            <div className="proj-cover" style={{ background: project.cover }}>
              <Icon name={project.icon} style={{ width: 38, height: 38 }} />
            </div>
            <div className="info">
              <h4>
                {project.name} <span className={`tag ${project.statusCls}`} style={{ marginLeft: 6 }}>{project.status}</span>
              </h4>
              <div className="meta">
                {project.status === '生成中' && <span className="live-dot" />}
                {project.skill} · {project.stage || project.homeMeta}
                {project.elapsed && ` · ${project.elapsed}`}
                {project.eta && ` · ${project.eta}`}
              </div>
              <div className={`progress${project.status === '生成中' ? ' live' : ''}`}>
                <div style={{ width: `${project.progress ?? 0}%` }} />
              </div>
            </div>
            <Link className={`btn ${project.status === '生成中' ? 'btn-outline' : 'btn-primary'} btn-sm act`} href={project.href ?? '/projects'}>
              {project.status === '生成中' ? '进入' : '去确认'}
            </Link>
          </div>
        ))}

        {/* 后端可达：真实活跃会话 + 运行中技能任务 */}
        {backendUp === true && activeItems.map((item) => (
          <div key={item.key} className="card proj-card hoverable">
            <div className="proj-cover" style={{ background: item.cover }}>
              <Icon name={item.icon} style={{ width: 38, height: 38 }} />
            </div>
            <div className="info">
              <h4>
                {item.name} <span className={`tag ${item.statusCls}`} style={{ marginLeft: 6 }}>{item.statusLabel}</span>
              </h4>
              <div className="meta">
                {item.live && <span className="live-dot" />}
                {item.meta}
              </div>
              <div className={`progress${item.live ? ' live' : ''}`}>
                <div style={{ width: `${item.progress}%` }} />
              </div>
            </div>
            <Link className={`btn ${item.live ? 'btn-outline' : 'btn-primary'} btn-sm act`} href={item.href}>
              {item.action}
            </Link>
          </div>
        ))}

        {/* 后端可达但无进行中项：空态引导 */}
        {backendUp === true && activeLoaded && activeItems.length === 0 && (
          <div className="proj-state">
            <Icon name="film" className="ic" />
            <h3>暂无进行中的项目</h3>
            <p>在上方输入一句灵感开拍，或到技能库挑一条生产线<br />项目跑起来后会实时出现在这里</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link className="btn btn-primary" href="/skills">逛技能库</Link>
              <Link className="btn btn-outline" href="/projects">看历史项目</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
