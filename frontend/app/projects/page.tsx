'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon, type IconName } from '@/components/Icon';
import {
  deletePipelineTask,
  deleteSession,
  fetchPipelineTasks,
  fetchSessions,
  type PipelineTask,
} from '@/lib/workflowApi';
import { deriveSessionStatus, sessionProgress, sessionStageName, sessionTitle } from '@/lib/sessionDisplay';
import { useAutoRefresh } from '@/lib/useAutoRefresh';

type TabKey = 'all' | 'running' | 'done' | 'failed';
type ItemTab = 'running' | 'done' | 'failed' | 'idle';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'running', label: '进行中' },
  { key: 'done', label: '已完成' },
  { key: 'failed', label: '失败' },
];

/** pipeline id → 技能展示名 / 图标 / 技能页 slug */
const PIPELINE_META: Record<string, { label: string; icon: IconName; slug: string }> = {
  standard: { label: '艺术短片', icon: 'film', slug: 'art-short-video' },
  digital_human: { label: '数字人口播', icon: 'user', slug: 'digital-human' },
  action_transfer: { label: '动作迁移', icon: 'refresh', slug: 'motion-transfer' },
};

const COVERS = [
  'linear-gradient(135deg,#B9A8F0,#6E56CF)',
  'linear-gradient(135deg,#C7B8F5,#8B5CF6)',
  'linear-gradient(135deg,#A8E6CF,#1FA98C)',
  'linear-gradient(135deg,#9BD4FF,#3AA7F5)',
  'linear-gradient(135deg,#F5C4D1,#EC6B9E)',
];

interface CardItem {
  key: string;
  /** 原始 id：session_id 或 task_id */
  rawId: string;
  kind: 'session' | 'task';
  name: string;
  meta: string;
  cover: string;
  icon: IconName;
  statusLabel: string;
  statusCls: string;
  tab: ItemTab;
  progress?: number;
  href: string;
  sortTs: number;
}

function fmtDate(tsSeconds: number): string {
  const d = new Date(tsSeconds * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function taskTab(task: PipelineTask): { label: string; cls: string; tab: ItemTab } {
  switch (task.status) {
    case 'completed':
      return { label: '已完成', cls: 'tag-green', tab: 'done' };
    case 'failed':
      return { label: '已失败', cls: 'tag-gray', tab: 'failed' };
    case 'running':
      return { label: '生成中', cls: 'tag-blue', tab: 'running' };
    default:
      return { label: '排队中', cls: 'tag-gray', tab: 'idle' };
  }
}

function taskTimestamp(task: PipelineTask): number {
  const raw = task.created_at || task.updated_at;
  const t = raw ? new Date(raw).getTime() : 0;
  return Number.isNaN(t) ? 0 : t / 1000;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('all');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingKey, setDeletingKey] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [sessions, tasks] = await Promise.all([fetchSessions(), fetchPipelineTasks()]);

      const sessionItems: CardItem[] = sessions.map((s: any, i: number) => {
        const st = deriveSessionStatus(s.status ?? {});
        const style = s.meta?.style || s.style || '默认风格';
        return {
          key: `session:${s.id}`,
          rawId: s.id,
          kind: 'session' as const,
          name: sessionTitle(s),
          meta: `短片创作 · ${style} · ${sessionStageName(s)} · ${fmtDate(s.date ?? 0)}`,
          cover: COVERS[i % COVERS.length],
          icon: 'film' as IconName,
          statusLabel: st.label,
          statusCls: st.cls,
          tab: st.tab,
          progress: sessionProgress(s),
          /* 已完成 → 工作台看真实产物；进行中/失败 → 等待页继续或重跑 */
          href: st.tab === 'done' ? `/studio?session=${s.id}` : `/waiting?session=${s.id}`,
          sortTs: s.date ?? 0,
        };
      });

      const taskItems: CardItem[] = tasks.map((t, i: number) => {
        const st = taskTab(t);
        const pm = PIPELINE_META[t.pipeline] ?? { label: t.pipeline, icon: 'zap' as IconName, slug: 'skills' };
        const progress = typeof t.progress === 'number' ? t.progress : undefined;
        return {
          key: `task:${t.task_id}`,
          rawId: t.task_id,
          kind: 'task' as const,
          name: t.input?.title || t.input?.idea || `${pm.label}任务`,
          meta: `${pm.label} · ${fmtDate(taskTimestamp(t))}`,
          cover: COVERS[(i + 2) % COVERS.length],
          icon: pm.icon,
          statusLabel: st.label,
          statusCls: st.cls,
          tab: st.tab,
          progress: st.tab === 'running' || st.tab === 'done' ? progress : undefined,
          href: `/skills/${pm.slug}`,
          sortTs: taskTimestamp(t),
        };
      });

      setItems([...sessionItems, ...taskItems].sort((a, b) => b.sortTs - a.sortTs));
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
      /* 静默刷新失败时保留旧数据，避免列表抖动清空 */
      if (!silent) setItems([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  /* 首次进入：全量加载（骨架态）；之后由下方 hook 静默轮询 */
  useEffect(() => {
    void load();
  }, [load]);

  const hasRunning = items.some((it) => it.tab === 'running');
  /* 实时刷新：有进行中项 5s 静默轮询；无则 60s 轻轮询；页面不可见自动暂停，恢复立即刷 */
  useAutoRefresh(() => load(true), { intervalMs: hasRunning ? 5000 : 60000, immediate: false });

  const manualRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    void load(true).finally(() => setRefreshing(false));
  };

  const countFor = useCallback(
    (key: TabKey): number => (key === 'all' ? items.length : items.filter((it) => it.tab === key).length),
    [items],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (it) =>
        (tab === 'all' || it.tab === tab) &&
        (q === '' || it.name.toLowerCase().includes(q) || it.meta.toLowerCase().includes(q)),
    );
  }, [items, tab, query]);

  const handleDelete = async (item: CardItem) => {
    if (!window.confirm(`确定删除「${item.name}」？删除后不可恢复。`)) return;
    setDeletingKey(item.key);
    try {
      if (item.kind === 'session') await deleteSession(item.rawId);
      else await deletePipelineTask(item.rawId);
      setItems((prev) => prev.filter((it) => it.key !== item.key));
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeletingKey('');
    }
  };

  const openItem = (item: CardItem) => router.push(item.href);

  return (
    <>
      <div className="head-row">
        <div className="page-head">
          <h1>项目库</h1>
          <p className="sub">所有短片与技能任务，一个库管完</p>
        </div>
        <div className="search-box">
          <Icon name="search" className="ic ic-sm" />
          <input
            placeholder="搜索项目、任务…"
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          />
        </div>
        <div className="refresh-box">
          <button
            type="button"
            className={`btn btn-outline refresh-btn${refreshing ? ' spinning' : ''}`}
            onClick={manualRefresh}
            title="刷新列表"
            aria-label="刷新列表"
          >
            <Icon name="refresh" className="ic ic-sm" />
          </button>
          {lastUpdated && <span className="refresh-ts">更新于 {fmtTime(lastUpdated)}</span>}
        </div>
        <Link className="btn btn-primary" href="/">
          <Icon name="zap" className="ic ic-sm" />
          新建短片
        </Link>
      </div>

      {error && (
        <div className="notice notice-error" style={{ marginBottom: 16 }}>
          <Icon name="alert" className="ic ic-sm" />
          <span>
            {error}
            <button type="button" onClick={() => void load()} style={{ marginLeft: 8, textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>
              重试
            </button>
          </span>
        </div>
      )}

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label} {countFor(t.key)}
          </button>
        ))}
      </div>

      <div className="proj-grid">
        {loading && (
          <div className="proj-state">
            <Icon name="refresh" className="ic" />
            <h3>正在加载项目…</h3>
            <p>从后端读取会话与任务列表</p>
          </div>
        )}

        {!loading && visible.length === 0 && !error && (
          <div className="proj-state">
            <Icon name="film" className="ic" />
            <h3>{items.length === 0 ? '还没有任何项目' : '当前筛选下没有项目'}</h3>
            <p>
              {items.length === 0
                ? '去首页输入一句灵感开拍第一部短片，或到技能库挑一条管线'
                : '换个筛选条件或清空搜索关键词试试'}
            </p>
            {items.length === 0 && (
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link className="btn btn-primary" href="/">开始创作</Link>
                <Link className="btn btn-outline" href="/skills">逛技能库</Link>
              </div>
            )}
          </div>
        )}

        {!loading &&
          visible.map((item) => (
            <div
              key={item.key}
              className="card proj-card2"
              role="button"
              tabIndex={0}
              onClick={() => openItem(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openItem(item);
                }
              }}
            >
              <div className="cover" style={{ background: item.cover }}>
                <Icon name={item.icon} />
                <span className={`st tag ${item.statusCls}`}>{item.statusLabel}</span>
                <button
                  type="button"
                  className="del"
                  title="删除"
                  aria-label={`删除 ${item.name}`}
                  disabled={deletingKey === item.key}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDelete(item);
                  }}
                >
                  <Icon name="trash" className="ic ic-sm" />
                </button>
              </div>
              <div className="body">
                <h4>{item.name}</h4>
                <div className="meta">{item.meta}</div>
                {typeof item.progress === 'number' && (
                  <div className="progress">
                    <div style={{ width: `${item.progress}%` }} />
                  </div>
                )}
              </div>
            </div>
          ))}
      </div>
    </>
  );
}
