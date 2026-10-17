'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import {
  fetchSessionArtifacts,
  fetchSessions,
  getSessionSnapshot,
  mediaUrl,
  type CharacterDesignArtifact,
  type PostProductionArtifact,
  type ReferenceArtifact,
  type ScriptArtifact,
  type SessionArtifacts,
  type StoryboardArtifact,
  type VideoArtifact,
} from '@/lib/workflowApi';
import {
  STAGE_KEYS,
  STAGE_NAMES,
  deriveSessionStatus,
  sessionProgress,
  sessionStageName,
  sessionTitle,
} from '@/lib/sessionDisplay';

/* ============ 工具 ============ */

function fmtTime(v: any): string {
  if (!v) return '';
  const d = typeof v === 'number' ? new Date(v * 1000) : new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 阶段 id → 产物键 + 图标 + tab 名 */
const TABS: Array<{ stage: string; label: string; icon: 'film' | 'image' | 'grid' | 'image' | 'video' | 'scissors' }> = [
  { stage: 'script_generation', label: '剧本', icon: 'film' },
  { stage: 'character_design', label: '角色场景', icon: 'image' },
  { stage: 'storyboard', label: '分镜', icon: 'grid' },
  { stage: 'reference_generation', label: '参考图', icon: 'image' },
  { stage: 'video_generation', label: '视频片段', icon: 'video' },
  { stage: 'post_production', label: '成片', icon: 'scissors' },
];

function hasArtifact(artifacts: SessionArtifacts | null, stage: string): boolean {
  if (!artifacts) return false;
  const a = (artifacts as any)[stage];
  if (!a) return false;
  if (stage === 'script_generation') return Boolean(a.title || a.logline || a.episodes?.length);
  if (stage === 'character_design') return Boolean(a.characters?.length || a.settings?.length);
  if (stage === 'storyboard') return Boolean(a.episodes?.length);
  if (stage === 'reference_generation') return Boolean(a.scenes?.length);
  if (stage === 'video_generation') return Boolean(a.clips?.length);
  if (stage === 'post_production') return Boolean(a.final_video || a.final_videos?.length);
  return false;
}

/* ============ 入口：无 session → 项目选择器；有 session → 工作台 ============ */

export default function StudioPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const sid = new URLSearchParams(window.location.search).get('session');
    setSessionId(sid);
    setChecked(true);
  }, []);

  if (!checked) return null;
  return sessionId ? <StudioSession sessionId={sessionId} /> : <StudioPicker />;
}

/* ============ 项目选择器（真实会话列表） ============ */

function StudioPicker() {
  const [sessions, setSessions] = useState<any[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setSessions(null);
    setError('');
    fetchSessions()
      .then((list) => setSessions([...list].sort((a, b) => (b.updated_at ?? b.date ?? 0) - (a.updated_at ?? a.date ?? 0))))
      .catch((e) => setError(e instanceof Error ? e.message : '加载失败'));
  }, []);

  useEffect(load, [load]);

  return (
    <div className="studio-page">
      <div className="proj-head">
        <Link href="/" className="back" aria-label="返回创作台">
          <Icon name="chevron-left" />
        </Link>
        <div>
          <h1>创作台</h1>
          <div className="meta">选择一个项目，查看它的真实产物 · 共 {sessions?.length ?? '—'} 个</div>
        </div>
        <div className="spacer" />
        <button className="btn btn-outline btn-sm" type="button" onClick={load}>
          <Icon name="refresh" className="ic ic-sm" />刷新
        </button>
        <Link className="btn btn-primary btn-sm" href="/">
          <Icon name="plus" className="ic ic-sm" />新建项目
        </Link>
      </div>

      {error ? (
        <div className="picker-grid">
          <div className="proj-state">
            <Icon name="alert" className="ic" />
            <h3>后端连接失败</h3>
            <p>{error} · 创作台需要后端服务才能展示真实项目</p>
            <button className="btn btn-outline" type="button" onClick={load}>重试</button>
          </div>
        </div>
      ) : !sessions ? (
        <div className="picker-grid">
          <div className="proj-state">
            <h3>正在加载项目…</h3>
          </div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="picker-grid">
          <div className="proj-state">
            <Icon name="film" className="ic" />
            <h3>还没有任何项目</h3>
            <p>回首页丢一个创意，跑完第一阶段后这里就会出现真实产物</p>
            <Link className="btn btn-primary" href="/">去创作台</Link>
          </div>
        </div>
      ) : (
        <div className="picker-grid">
          {sessions.map((s) => {
            const st = deriveSessionStatus(s.status ?? {});
            return (
              <Link key={s.id} href={`/studio?session=${s.id}`} className="card proj-card2 hoverable">
                <div className="pc-head">
                  <span className="pc-ic">
                    <Icon name="film" />
                  </span>
                  <div className="pc-title">
                    <h4>{sessionTitle(s)}</h4>
                    <div className="meta">
                      {sessionStageName(s)} · {fmtTime(s.updated_at ?? s.date)}
                    </div>
                  </div>
                  <span className={`tag ${st.cls} pc-st`}>{st.label}</span>
                </div>
                <div className={`progress${st.tab === 'running' ? ' live' : ''}`}>
                  <div style={{ width: `${sessionProgress(s)}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============ 单个项目的工作台 ============ */

function StudioSession({ sessionId }: { sessionId: string }) {
  const [snapshot, setSnapshot] = useState<any>(null);
  const [artifacts, setArtifacts] = useState<SessionArtifacts | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0);

  const load = useCallback(() => {
    setSnapshot(null);
    setArtifacts(null);
    setError('');
    Promise.all([getSessionSnapshot(sessionId), fetchSessionArtifacts(sessionId)])
      .then(([snap, arts]) => {
        setSnapshot(snap);
        setArtifacts(arts);
      })
      .catch((e) => setError(e instanceof Error ? e.message : '加载失败'));
  }, [sessionId]);

  useEffect(load, [load]);

  /* 默认停靠在「最有产物的阶段」：从后往前找第一个有产物的 tab */
  useEffect(() => {
    if (!artifacts) return;
    let idx = 0;
    TABS.forEach((t, i) => {
      if (hasArtifact(artifacts, t.stage)) idx = i;
    });
    setTab(idx);
  }, [artifacts]);

  if (error) {
    return (
      <div className="studio-page">
        <div className="proj-head">
          <Link href="/studio" className="back" aria-label="返回项目列表">
            <Icon name="chevron-left" />
          </Link>
          <div>
            <h1>项目加载失败</h1>
            <div className="meta">{error}</div>
          </div>
        </div>
        <div className="picker-grid">
          <div className="proj-state">
            <Icon name="alert" className="ic" />
            <h3>打不开这个项目</h3>
            <p>会话可能已被删除，或后端暂时不可达</p>
            <Link className="btn btn-primary" href="/studio">返回项目列表</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!snapshot || !artifacts) {
    return (
      <div className="studio-page">
        <div className="picker-grid">
          <div className="proj-state">
            <h3>正在加载产物…</h3>
          </div>
        </div>
      </div>
    );
  }

  const meta = snapshot.meta ?? {};
  const st = deriveSessionStatus(snapshot.status ?? {});
  const doneCount = STAGE_KEYS.filter((k) => snapshot.status?.[k] === 'completed').length;
  const allDone = doneCount === STAGE_KEYS.length;
  const title = snapshot.title || artifacts.script_generation?.title || meta.idea || '未命名短片';

  return (
    <div className="studio-page">
      <div className="proj-head">
        <Link href="/studio" className="back" aria-label="返回项目列表">
          <Icon name="chevron-left" />
        </Link>
        <div>
          <h1>
            {title}{' '}
            <span className={`tag ${st.cls}`} style={{ marginLeft: 6 }}>{st.label}</span>
          </h1>
          <div className="meta">
            短片创作 · {meta.episodes ?? 1} 集 · {meta.style || '默认风格'} · {meta.video_ratio || '9:16'} · 更新于 {fmtTime(snapshot.updated_at)}
          </div>
        </div>
        <div className="spacer" />
        {!allDone && (
          <Link className="btn btn-primary btn-sm" href={`/waiting?session=${sessionId}`}>
            <Icon name="zap" className="ic ic-sm" />去继续生成
          </Link>
        )}
        <button className="btn btn-outline btn-sm" type="button" onClick={load}>
          <Icon name="refresh" className="ic ic-sm" />刷新
        </button>
      </div>

      <div className="pipeline">
        {STAGE_KEYS.map((key, i) => {
          const s = snapshot.status?.[key];
          const cls = s === 'completed' ? 'done' : s === 'running' ? 'running' : s === 'waiting' ? 'wait' : s === 'error' ? 'err' : '';
          const label = s === 'completed' ? '已完成' : s === 'running' ? '生成中' : s === 'waiting' ? '待确认' : s === 'error' ? '失败' : '等待中';
          return (
            <div key={key} style={{ display: 'contents' }}>
              <button
                type="button"
                className={`stage-node ${cls}`}
                onClick={() => setTab(i)}
                title={STAGE_NAMES[key]}
              >
                <div className="dot">
                  <Icon name={s === 'completed' ? 'check' : TABS[i].icon} className="ic ic-sm" />
                </div>
                <div className="name">{TABS[i].label}</div>
                <div className="st">{label}</div>
              </button>
              {i < STAGE_KEYS.length - 1 && <div className={`stage-link${s === 'completed' ? ' done' : ''}`} />}
            </div>
          );
        })}
      </div>

      <div className="work-area">
        <div className="card stage-detail">
          {!allDone && (
            <div className="notice" style={{ marginTop: 0, marginBottom: 18 }}>
              <Icon name="clock" className="ic" />
              <span>
                项目还在生成中（{doneCount}/{STAGE_KEYS.length} 阶段已完成），下面只展示已产出的真实内容。
                <Link href={`/waiting?session=${sessionId}`} style={{ color: 'inherit', textDecoration: 'underline', marginLeft: 4 }}>去等待页继续 →</Link>
              </span>
            </div>
          )}

          <div className="film-tabs">
            {TABS.map((t, i) => (
              <button
                key={t.stage}
                type="button"
                className={`film-tab${tab === i ? ' on' : ''}`}
                disabled={!hasArtifact(artifacts, t.stage)}
                onClick={() => setTab(i)}
                title={hasArtifact(artifacts, t.stage) ? t.label : `${t.label} · 尚未生成`}
              >
                <Icon name={t.icon} className="ic ic-sm" />
                {t.label}
              </button>
            ))}
          </div>

          {tab === 0 && <ScriptPanel script={artifacts.script_generation} />}
          {tab === 1 && <DesignPanel design={artifacts.character_design} />}
          {tab === 2 && <StoryboardPanel storyboard={artifacts.storyboard} />}
          {tab === 3 && <ReferencePanel reference={artifacts.reference_generation} />}
          {tab === 4 && <ClipsPanel video={artifacts.video_generation} />}
          {tab === 5 && <FinalPanel post={artifacts.post_production} />}
        </div>

        <div className="side-col">
          <div className="card side-card">
            <h3>
              <Icon name="sparkles" className="ic ic-sm" />项目信息
            </h3>
            <div className="idea-box">{meta.idea || meta.user_textbox_input || '（无创意记录）'}</div>
            <div className="kv"><span className="k">风格</span><span className="v">{meta.style || '默认'}</span></div>
            <div className="kv"><span className="k">集数</span><span className="v">{meta.episodes ?? 1} 集</span></div>
            <div className="kv"><span className="k">画面比例</span><span className="v">{meta.video_ratio || '9:16'}</span></div>
            <div className="kv"><span className="k">分辨率</span><span className="v">{meta.video_resolution || '720P'}</span></div>
            <details className="adv">
              <summary>
                <Icon name="settings" className="ic ic-sm" />模型配置
              </summary>
              <div className="models">
                <div className="kv"><span className="k">剧本 LLM</span><span className="v">{meta.llm_model || '—'}</span></div>
                <div className="kv"><span className="k">视觉 VLM</span><span className="v">{meta.vlm_model || '—'}</span></div>
                <div className="kv"><span className="k">图像模型</span><span className="v">{meta.image_t2i_model || '—'}</span></div>
                <div className="kv"><span className="k">视频模型</span><span className="v">{meta.video_first_frame_model || meta.video_model || '—'}</span></div>
                <div className="kv"><span className="k">生成方式</span><span className="v">{meta.video_generation_mode === 'first_frame' ? '首帧生视频' : meta.video_generation_mode || '—'}</span></div>
              </div>
            </details>
          </div>

          <div className="card side-card">
            <h3>
              <Icon name="clock" className="ic ic-sm" />阶段进度
            </h3>
            <div className="timeline">
              {STAGE_KEYS.map((key) => {
                const s = snapshot.status?.[key];
                const color = s === 'completed' ? 'var(--green)' : s === 'running' ? 'var(--blue)' : s === 'waiting' ? 'var(--amber)' : s === 'error' ? 'var(--red)' : 'var(--border-strong)';
                const text = s === 'completed' ? '已完成' : s === 'running' ? '生成中' : s === 'waiting' ? '待确认' : s === 'error' ? '失败' : '等待中';
                return (
                  <div className="tl-item" key={key}>
                    <div className="tdot" style={{ background: color }} />
                    <div>
                      <div className="tt">{STAGE_NAMES[key]}</div>
                      <div className="tm">{text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card side-card">
            <h3>
              <Icon name="folder" className="ic ic-sm" />更多操作
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link className="btn btn-outline btn-sm" href="/projects">项目库管理</Link>
              <Link className="btn btn-outline btn-sm" href={`/waiting?session=${sessionId}`}>等待页 / 重跑阶段</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ 各阶段产物面板 ============ */

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="proj-state" style={{ border: '1px dashed var(--border-strong)' }}>
      <Icon name="alert" className="ic" />
      <h3>暂无内容</h3>
      <p>{text}</p>
    </div>
  );
}

function ScriptPanel({ script }: { script: ScriptArtifact | null }) {
  if (!script) return <EmptyPanel text="剧本阶段尚未生成" />;
  return (
    <div>
      {script.logline && <div className="script-logline">{script.logline}</div>}
      <div className="script-tags">
        {(script.genre ?? []).map((g) => (
          <span className="tag tag-blue" key={g}>{g}</span>
        ))}
        {script.mood && <span className="tag tag-amber">{script.mood}</span>}
        {script.meta?.generation_model && <span className="tag tag-gray">{script.meta.generation_model}</span>}
      </div>

      {!!script.characters?.length && (
        <div className="script-block">
          <h4><Icon name="user" className="ic ic-sm" />角色（{script.characters.length}）</h4>
          {script.characters.map((c) => (
            <div className="script-role" key={c.character_id ?? c.name}>
              <span className="nm">{c.name}</span>
              <span className="ds">{c.description}</span>
            </div>
          ))}
        </div>
      )}

      {!!script.settings?.length && (
        <div className="script-block">
          <h4><Icon name="map-pin" className="ic ic-sm" />场景（{script.settings.length}）</h4>
          {script.settings.map((s) => (
            <div className="script-role" key={s.setting_id ?? s.name}>
              <span className="nm">{s.name}</span>
              <span className="ds">{s.description}</span>
            </div>
          ))}
        </div>
      )}

      {!!script.episodes?.length && (
        <div className="script-block">
          <h4><Icon name="book" className="ic ic-sm" />分集剧本（{script.episodes.length}）</h4>
          {script.episodes.map((ep) => (
            <div className="script-ep" key={ep.episode_number} style={{ marginBottom: 10 }}>
              <h5>第 {ep.episode_number} 集{ep.act_title ? ` · ${ep.act_title}` : ''}</h5>
              <pre>{ep.content}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DesignPanel({ design }: { design: CharacterDesignArtifact | null }) {
  const chars = design?.characters ?? [];
  const sets = design?.settings ?? [];
  if (!chars.length && !sets.length) return <EmptyPanel text="角色/场景设计尚未生成" />;
  return (
    <div>
      {!!chars.length && (
        <div className="script-block">
          <h4><Icon name="user" className="ic ic-sm" />角色设定图（{chars.length}）</h4>
          <div className="media-grid">
            {chars.map((c) => (
              <div className="media-cell" key={c.id}>
                <div className="ph">
                  {c.selected || c.versions?.[0] ? (
                    <img src={mediaUrl(c.selected || c.versions?.[0])} alt={c.name} loading="lazy" />
                  ) : '（无图）'}
                </div>
                <div className="cap">
                  <h5>
                    {c.name}
                    {(c.versions?.length ?? 0) > 1 && <span className="vtag">{c.versions!.length} 版</span>}
                  </h5>
                  <div className="desc">{c.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {!!sets.length && (
        <div className="script-block">
          <h4><Icon name="map-pin" className="ic ic-sm" />场景设定图（{sets.length}）</h4>
          <div className="media-grid">
            {sets.map((s) => (
              <div className="media-cell" key={s.id}>
                <div className="ph">
                  {s.selected || s.versions?.[0] ? (
                    <img src={mediaUrl(s.selected || s.versions?.[0])} alt={s.name} loading="lazy" />
                  ) : '（无图）'}
                </div>
                <div className="cap">
                  <h5>
                    {s.name}
                    {(s.versions?.length ?? 0) > 1 && <span className="vtag">{s.versions!.length} 版</span>}
                  </h5>
                  <div className="desc">{s.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StoryboardPanel({ storyboard }: { storyboard: StoryboardArtifact | null }) {
  const eps = storyboard?.episodes ?? [];
  if (!eps.length) return <EmptyPanel text="分镜设计尚未生成" />;
  return (
    <div>
      {eps.map((ep) => (
        <div className="script-block" key={ep.episode_number}>
          <h4>
            <Icon name="grid" className="ic ic-sm" />
            第 {ep.episode_number} 集{ep.episode_title ? ` · ${ep.episode_title}` : ''}（{ep.segments?.length ?? 0} 个分镜）
          </h4>
          {(ep.segments ?? []).map((seg) => (
            <div className="sb-seg" key={seg.segment_id}>
              <div className="seg-head">
                <span className="no">片段 {seg.segment_number ?? ''}</span>
                <span className="ctx">
                  {[seg.scene_time, seg.scene_space, seg.location].filter(Boolean).join(' · ')}
                  {seg.total_duration ? ` · ${seg.total_duration}s` : ''}
                  {seg.characters?.length ? ` · ${seg.characters.join('、')}` : ''}
                </span>
              </div>
              {(seg.shots ?? []).map((shot) => (
                <div className="sb-shot" key={shot.shot_number}>
                  <span className="sn">镜 {shot.shot_number} · {shot.shot_type}{shot.duration ? ` · ${shot.duration}s` : ''}</span>
                  <span className="sc">{shot.content}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ReferencePanel({ reference }: { reference: ReferenceArtifact | null }) {
  const scenes = reference?.scenes ?? [];
  if (!scenes.length) return <EmptyPanel text="参考图尚未生成" />;
  return (
    <div>
      <div className="script-block">
        <h4><Icon name="image" className="ic ic-sm" />分镜头图（{scenes.length}）</h4>
        <div className="media-grid">
          {scenes.map((sc) => (
            <div className="media-cell" key={sc.id}>
              <div className="ph">
                {sc.selected || sc.versions?.[0] ? (
                  <img src={mediaUrl(sc.selected || sc.versions?.[0])} alt={sc.name ?? sc.id} loading="lazy" />
                ) : '（无图）'}
              </div>
              <div className="cap">
                <h5>
                  {sc.name ?? sc.id}
                  {(sc.versions?.length ?? 0) > 1 && <span className="vtag">{sc.versions!.length} 版</span>}
                </h5>
                {sc.visual_prompt && (
                  <details>
                    <summary>查看画面提示词</summary>
                    <div className="prompt">{sc.visual_prompt}</div>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClipsPanel({ video }: { video: VideoArtifact | null }) {
  const clips = video?.clips ?? [];
  if (!clips.length) return <EmptyPanel text="视频片段尚未生成" />;
  return (
    <div className="script-block">
      <h4><Icon name="video" className="ic ic-sm" />视频片段（{clips.length}）</h4>
      <div className="media-grid">
        {clips.map((c) => (
          <div className="media-cell" key={c.id}>
            <div className="ph">
              {c.selected || c.versions?.[0] ? (
                <video src={mediaUrl(c.selected || c.versions?.[0])} controls preload="metadata" playsInline />
              ) : '（无视频）'}
            </div>
            <div className="cap">
              <h5>
                {c.name ?? c.id}
                {c.duration ? <span className="vtag">{c.duration}s</span> : null}
              </h5>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinalPanel({ post }: { post: PostProductionArtifact | null }) {
  const path = post?.final_video || post?.final_videos?.[0]?.path || '';
  if (!path) return <EmptyPanel text="成片尚未生成" />;
  const name = post?.final_videos?.[0]?.name || '最终成片';
  return (
    <div>
      <div className="final-film">
        <video src={mediaUrl(path)} controls preload="metadata" playsInline />
      </div>
      <div className="final-meta">
        <span>{name}</span>
        {post?.final_videos?.length ? <span>共 {post.final_videos.length} 集成片</span> : null}
        <a className="btn btn-outline btn-sm" href={mediaUrl(path)} download>
          <Icon name="arrow-down" className="ic ic-sm" />下载成片
        </a>
      </div>
    </div>
  );
}
