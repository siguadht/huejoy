'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import {
  continueWorkflow,
  fetchStages,
  getSessionSnapshot,
  runStageStream,
  stopProject,
  type SessionSnapshot,
  type StageInfo,
  type StreamEvent,
} from '@/lib/workflowApi';

/* ============================================================
 * 等待体验页 · 双模式
 *  - 演示模式（无 session 参数）：本地模拟，展示等待体验设计
 *  - 真实模式（?session=<id>）：SSE 驱动真实 6 阶段工作流
 * ============================================================ */

/** 后端 6 阶段（与 /api/stages 对齐的兜底常量） */
const FALLBACK_STAGES: StageInfo[] = [
  { id: 'script_generation', name: '剧本生成', order: 1, description: '将灵感转化为结构化剧本' },
  { id: 'character_design', name: '角色/场景设计', order: 2, description: '生成角色设计图和场景背景' },
  { id: 'storyboard', name: '分镜设计', order: 3, description: '设计镜头语言和分镜脚本' },
  { id: 'reference_generation', name: '参考图生成', order: 4, description: '生成高精度参考图' },
  { id: 'video_generation', name: '视频生成', order: 5, description: '将参考图/分镜图生成视频' },
  { id: 'post_production', name: '后期剪辑', order: 6, description: '拼接视频片段为最终成片' },
];

/* ============ 工具：从阶段产物里提取可读内容 ============ */

/** 清洗 LLM 文本里的 <action> 等 XML 风格标记，只留可读内容 */
function cleanScriptText(text: string): string {
  return text
    .replace(/<\/?[a-zA-Z][^>\n]*>/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractScriptText(payload: unknown): string {
  return cleanScriptText(extractScriptTextRaw(payload));
}

function extractScriptTextRaw(payload: unknown): string {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  const p = payload as Record<string, any>;
  for (const k of ['script', 'content', 'text', 'full_script', 'outline']) {
    if (typeof p[k] === 'string' && p[k].length > 20) return p[k];
  }
  if (Array.isArray(p.episodes)) {
    const parts: string[] = [];
    for (const ep of p.episodes.slice(0, 2)) {
      if (typeof ep === 'string') parts.push(ep);
      else if (ep && typeof ep === 'object') {
        const e = ep as Record<string, any>;
        if (typeof e.content === 'string') parts.push(e.content);
        else if (Array.isArray(e.scenes)) {
          parts.push(e.scenes.map((s: any) => s?.description || s?.content || s?.shot_desc || '').filter(Boolean).join('\n'));
        }
      }
    }
    if (parts.join('').length > 20) return parts.join('\n\n');
  }
  let found = '';
  const walk = (v: unknown, d: number) => {
    if (found || d > 4) return;
    if (typeof v === 'string' && v.length > 40) {
      found = v;
      return;
    }
    if (Array.isArray(v)) v.forEach((x) => walk(x, d + 1));
    else if (v && typeof v === 'object') Object.values(v).forEach((x) => walk(x, d + 1));
  };
  walk(p, 0);
  return found.slice(0, 600);
}

/** 产物里的视频路径 → 可访问的 /code 静态地址 */
function toCodeUrl(path: string): string {
  const idx = path.indexOf('/code/');
  if (idx >= 0) return path.slice(idx);
  return path.startsWith('/') ? path : `/code/${path}`;
}

function extractVideos(payload: unknown): string[] {
  const out: string[] = [];
  const walk = (v: unknown, d: number) => {
    if (d > 5) return;
    if (typeof v === 'string' && /\.(mp4|mov|webm)$/i.test(v)) {
      out.push(toCodeUrl(v));
      return;
    }
    if (Array.isArray(v)) v.forEach((x) => walk(x, d + 1));
    else if (v && typeof v === 'object') Object.values(v).forEach((x) => walk(x, d + 1));
  };
  walk(payload, 0);
  return [...new Set(out)].slice(0, 6);
}

function fmtElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ============================================================
 * 真实模式：SSE 驱动 6 阶段工作流
 * ============================================================ */

type RealPhase = 'connecting' | 'running' | 'intervention' | 'stopped' | 'error' | 'done';

interface RealWaitingProps {
  sessionId: string;
}

function RealWaiting({ sessionId }: RealWaitingProps) {
  const [stages, setStages] = useState<StageInfo[]>(FALLBACK_STAGES);
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const [phase, setPhase] = useState<RealPhase>('connecting');
  const [stagePct, setStagePct] = useState(0);
  const [logs, setLogs] = useState<{ t: string; stage: string; text: string; ok: boolean }[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [auto, setAuto] = useState(true);
  const [idea, setIdea] = useState('');
  const [scriptText, setScriptText] = useState('');

  const autoRef = useRef(true);
  const drivingRef = useRef(false);
  const stoppedRef = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  autoRef.current = auto;

  const pushLog = useCallback((stage: string, text: string, ok = false) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setLogs((prev) => [...prev, { t: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`, stage, text, ok }].slice(-40));
  }, []);

  /* ---- 阶段列表 ---- */
  useEffect(() => {
    fetchStages()
      .then((list) => {
        if (list.length) setStages([...list].sort((a, b) => a.order - b.order));
      })
      .catch(() => { /* 用兜底常量 */ });
  }, []);

  /* ---- 计时 ---- */
  useEffect(() => {
    const id = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  /* ---- 日志自动滚动 ---- */
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  /* ---- 刷新快照 ---- */
  const refresh = useCallback(async () => {
    try {
      const snap = await getSessionSnapshot(sessionId);
      setSnapshot(snap);
      if (snap.meta?.idea) setIdea(String(snap.meta.idea));
      const scriptArt = snap.artifacts?.script_generation;
      if (scriptArt) setScriptText(extractScriptText(scriptArt));
      return snap;
    } catch (err) {
      setPhase('error');
      setErrorMsg(err instanceof Error ? err.message : '会话状态获取失败');
      return null;
    }
  }, [sessionId]);

  /* ---- 驱动循环：推进 6 阶段 ---- */
  const drive = useCallback(async () => {
    if (drivingRef.current || stoppedRef.current) return;
    drivingRef.current = true;
    try {
      for (let guard = 0; guard < 40; guard++) {
        if (stoppedRef.current) break;
        const snap = await refresh();
        if (!snap) break;

        // 全部阶段完成 → 收工
        const unfinished = stages.find((s) => snap.status[s.id] !== 'completed');
        if (!unfinished) {
          setPhase('done');
          pushLog('完成', '全部 6 个阶段已完成，成片已就绪', true);
          break;
        }

        const curId = snap.current_stage;
        const curStatus = snap.status[curId];
        const isInit = !stages.some((s) => s.id === curId);

        // 后端可能仍在跑上一轮（如刷新页面前的执行）：轮询等待，不重复执行
        if (!isInit && curStatus === 'running') {
          setPhase('running');
          pushLog(curId, '检测到阶段仍在后端执行，等待中…', false);
          await new Promise((res) => setTimeout(res, 2000));
          continue;
        }

        if (!isInit && (curStatus === 'completed' || curStatus === 'waiting')) {
          // 用户确认点：manual 模式停下等确认；auto 模式自动继续
          if (curStatus === 'waiting' && !autoRef.current) {
            setPhase('intervention');
            pushLog(curId, '阶段已产出，等待确认', false);
            break;
          }
          pushLog(curId, curStatus === 'waiting' ? '自动确认，进入下一阶段' : '进入下一阶段', false);
          const r = await continueWorkflow(sessionId);
          if (r.status === 'completed') {
            setPhase('done');
            pushLog('完成', '全部 6 个阶段已完成，成片已就绪', true);
            break;
          }
          if (r.status === 'waiting') {
            // 后端说还在跑，稍等再探
            await new Promise((res) => setTimeout(res, 1500));
          }
          continue;
        }

        // 执行目标阶段：init 会话直接执行首个未完成阶段（后端 execute 会自行推进 current_stage）
        const targetId = isInit ? unfinished.id : curId;
        setPhase('running');
        setStagePct(0);
        pushLog(targetId, '开始执行', false);
        await runStageStream(sessionId, targetId, {}, {
          onProgress: (ev: StreamEvent) => {
            if (typeof ev.percent === 'number') setStagePct(Math.max(0, Math.min(100, ev.percent)));
            if (ev.message) pushLog(targetId, ev.message, false);
          },
          onComplete: (ev) => {
            setStagePct(100);
            const needs = Boolean(ev.requires_intervention);
            pushLog(targetId, needs ? '阶段产出完成，等待确认' : '阶段完成', true);
          },
          onError: (msg) => {
            stoppedRef.current = true;
            setPhase('error');
            setErrorMsg(msg);
            pushLog(targetId, `失败：${msg}`, false);
          },
        });
        if (stoppedRef.current) break;
      }
    } finally {
      drivingRef.current = false;
    }
  }, [refresh, pushLog, sessionId, stages]);

  /* ---- 进场：加载快照并启动 ---- */
  useEffect(() => {
    stoppedRef.current = false; // StrictMode 双挂载时复位，避免清理函数把驱动循环永久锁死
    (async () => {
      const snap = await refresh();
      if (!snap) return;
      const unfinished = stages.find((s) => snap.status[s.id] !== 'completed');
      if (!unfinished) {
        setPhase('done');
        return;
      }
      void drive();
    })();
    return () => {
      stoppedRef.current = true;
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- 手动确认 ---- */
  const confirmContinue = useCallback(async () => {
    setPhase('running');
    const r = await continueWorkflow(sessionId);
    if (r.status === 'completed') {
      setPhase('done');
      return;
    }
    void drive();
  }, [drive, sessionId]);

  /* ---- 停止 ---- */
  const handleStop = useCallback(async () => {
    stoppedRef.current = true;
    try {
      await stopProject(sessionId);
    } catch {
      /* 后端可能已结束 */
    }
    setPhase('stopped');
    pushLog('停止', '已被手动停止', false);
  }, [pushLog, sessionId]);

  /* ---- 重试 ---- */
  const retry = useCallback(() => {
    stoppedRef.current = false;
    setErrorMsg('');
    void drive();
  }, [drive]);

  /* ---- 派生状态 ---- */
  const statusMap = snapshot?.status ?? {};
  const doneCount = stages.filter((s) => statusMap[s.id] === 'completed').length;
  const totalPct = Math.round(((doneCount + stagePct / 100) / stages.length) * 100);
  const curId = snapshot?.current_stage ?? '';
  // init 不在后端 /api/stages 列表中，find 落空时回退中文名，避免页面露出原始 id
  const curStageName = stages.find((s) => s.id === curId)?.name ?? (curId === 'init' ? '初始化' : curId);
  const videos = snapshot?.artifacts?.post_production ? extractVideos(snapshot.artifacts.post_production) : [];
  const scriptArtifact = snapshot?.artifacts?.script_generation;

  const stageState = (id: string): 'done' | 'running' | 'wait' | 'error' => {
    const st = statusMap[id];
    if (st === 'completed') return 'done';
    if (st === 'running') return 'running';
    if (st === 'error' || st === 'stopped') return 'error';
    if (st === 'waiting') return 'wait';
    return id === curId && phase === 'running' ? 'running' : 'wait';
  };

  const confetti = useState(
    () =>
      Array.from({ length: 60 }, () => ({
        left: Math.random() * 100,
        color: ['#8B5CF6', '#3AA7F5', '#34B37B', '#F0A02E', '#EC6B9E'][Math.floor(Math.random() * 5)],
        delay: Math.random() * 0.8,
        duration: 1.8 + Math.random() * 1.2,
        round: Math.random() < 0.4,
      })),
  )[0];

  return (
    <div>
      {/* ===== 等待头部 ===== */}
      <div className="card wait-head">
        <div className="wait-cover">
          <Icon name="film" style={{ width: 40, height: 40 }} />
        </div>
        <div className="info">
          <h1>
            {idea ? (idea.length > 18 ? idea.slice(0, 18) + '…' : idea) : '新项目'}{' '}
            <span className="tag tag-blue"><span className="live-dot" />真实生成</span>{' '}
            <span className={`tag ${phase === 'done' ? 'tag-green' : phase === 'error' ? 'tag-amber' : 'tag-gray'}`}>
              {phase === 'done' ? '已完成' : phase === 'error' ? '生成中断' : phase === 'stopped' ? '已停止' : '后台运行中'}
            </span>
          </h1>
          <p className="sub">
            短片创作 · 第 <b>{Math.min(doneCount + 1, stages.length)}</b>/{stages.length} 阶段：
            {phase === 'done' ? '已全部完成' : curStageName || '准备中'} · 你可以随时离开，跑完通知你
          </p>
          <div className="eta-row">
            <div className="eta">
              <span className="label">已运行</span>
              <span className="num">{fmtElapsed(elapsed)}</span>
            </div>
            <div className="eta">
              <span className="label">总进度</span>
              <span className="num">{totalPct}%</span>
            </div>
            <div className="head-actions">
              <div className="switch-row">
                <div
                  className={`switch${auto ? ' on' : ''}`}
                  onClick={() => setAuto((v) => !v)}
                  role="switch"
                  aria-checked={auto}
                  title="自动挡：每个阶段产出后自动确认并继续"
                />
                <Icon name="zap" className="ic ic-sm" style={{ color: 'var(--text-3)' }} />
                <span className="sub">{auto ? '自动挡' : '专手动'}</span>
              </div>
              {phase === 'running' || phase === 'intervention' || phase === 'connecting' ? (
                <button className="btn btn-outline btn-sm" type="button" onClick={handleStop}>
                  <Icon name="pause" className="ic ic-sm" />停止
                </button>
              ) : null}
              <Link className="btn btn-ghost btn-sm" href="/">离开</Link>
            </div>
          </div>
          <div className="progress live"><div style={{ width: `${totalPct}%` }} /></div>
        </div>
      </div>

      {/* ===== 错误条 ===== */}
      {phase === 'error' && (
        <div className="card panel" style={{ marginTop: 16, borderColor: 'var(--red)' }}>
          <h3><Icon name="alert" style={{ color: 'var(--red)' }} />生成中断</h3>
          <p className="desc" style={{ margin: '8px 0 12px' }}>{errorMsg || '未知错误'}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary btn-sm" type="button" onClick={retry}>重试继续</button>
            <Link className="btn btn-outline btn-sm" href="/settings">去设置页检查模型配置</Link>
          </div>
        </div>
      )}

      {/* ===== 停止条 ===== */}
      {phase === 'stopped' && (
        <div className="card panel" style={{ marginTop: 16 }}>
          <h3><Icon name="pause" />已停止</h3>
          <p className="desc" style={{ margin: '8px 0 12px' }}>生成已被手动停止，已完成的阶段产物仍保留在会话里。</p>
          <button className="btn btn-primary btn-sm" type="button" onClick={retry}>继续生成</button>
        </div>
      )}

      {/* ===== 待确认条 ===== */}
      {phase === 'intervention' && (
        <div className="card panel" style={{ marginTop: 16, borderColor: 'var(--primary)' }}>
          <h3><Icon name="check" style={{ color: 'var(--primary)' }} />「{curStageName}」已产出，等待你确认</h3>
          <p className="desc" style={{ margin: '8px 0 12px' }}>
            专手动模式下，每个阶段都会停下来等你过目。打开自动挡可让它一路跑到底。
          </p>
          <button className="btn btn-primary btn-sm" type="button" onClick={confirmContinue}>
            <Icon name="check" className="ic ic-sm" />确认并继续
          </button>
        </div>
      )}

      <div className="wait-cols">
        {/* ===== 左列 ===== */}
        <div>
          <div className="card panel">
            <h3><Icon name="zap" />阶段叙事流<span className="more">真实工作流进度</span></h3>
            <div className="stage-flow">
              {stages.map((s, i) => {
                const st = stageState(s.id);
                return (
                  <div key={s.id} className={`tl-node ${st === 'done' ? 'done' : st === 'running' ? 'running' : st === 'error' ? 'wait' : 'wait'}`}>
                    <div className="dot">
                      {st === 'done' ? <Icon name="check" /> : st === 'running' ? <span className="spinner" /> : i + 1}
                    </div>
                    <h4>
                      {['①', '②', '③', '④', '⑤', '⑥'][i] ?? i + 1} {s.name}{' '}
                      {st === 'done' && <span className="tag tag-green">已完成</span>}
                      {st === 'running' && <span className="tag tag-blue">进行中</span>}
                      {st === 'wait' && statusMap[s.id] === 'waiting' && <span className="tag tag-amber">待确认</span>}
                      {st === 'error' && <span className="tag tag-red">失败</span>}
                      {st === 'wait' && statusMap[s.id] !== 'waiting' && <span className="tag tag-gray">排队中</span>}
                    </h4>
                    <p className="desc">{s.description}</p>
                    {st === 'running' && (
                      <div className="shot-progress">
                        <div className="progress live"><div style={{ width: `${stagePct}%` }} /></div>
                        <span className="n">{stagePct}%</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card panel" style={{ marginTop: 16 }}>
            <h3><Icon name="book" />剧本预览<span className="more">剧本阶段产出后可见</span></h3>
            {scriptText ? (
              <div className="preview-box">
                <div className="scene-tag"><Icon name="film" className="ic ic-sm" />剧本生成 · 已产出</div>
                <p className="script">{scriptText}</p>
                <div className="preview-actions">
                  <Link className="btn btn-outline btn-sm" href="/studio">进入工作台</Link>
                </div>
              </div>
            ) : (
              <p className="desc" style={{ padding: '8px 0' }}>
                {scriptArtifact === undefined ? '剧本阶段还没跑完，跑完这里就能看。' : '剧本阶段产物已就绪。'}
              </p>
            )}
          </div>

          <div className="card panel" style={{ marginTop: 16 }}>
            <h3><Icon name="refresh" />实时日志<span className="more">导演组的工作记录</span></h3>
            <div className="log-stream" ref={logRef}>
              {logs.map((l, i) => (
                <div key={i}>
                  <span className="t">{l.t}</span>[{l.stage}] {l.text}
                  {l.ok ? <span className="ok"> ✓</span> : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ===== 右列 ===== */}
        <div>
          <div className="card panel">
            <h3><Icon name="image" />已出产物<span className="more">生成中也能反复看</span></h3>
            <div className="artifacts">
              {stages.map((s) => {
                const st = statusMap[s.id];
                const has = Boolean(snapshot?.artifacts?.[s.id]);
                return (
                  <div key={s.id} className={`artifact${has ? '' : ' lock'}`}>
                    <Icon name={has ? 'check' : 'film'} style={{ color: has ? 'var(--green)' : 'var(--text-3)' }} />
                    {s.name}
                    <span className="st">{has ? '可看' : st === 'running' ? '生成中' : '未开始'}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card panel" style={{ marginTop: 16 }}>
            <h3><Icon name="sparkles" />会话信息</h3>
            <div className="kv"><span className="k">会话 ID</span><span className="v" style={{ fontSize: 12 }}>{sessionId.slice(0, 12)}…</span></div>
            <div className="kv"><span className="k">当前阶段</span><span className="v">{curStageName || '—'}</span></div>
            <div className="kv"><span className="k">已完成</span><span className="v">{doneCount}/{stages.length}</span></div>
            <div className="kv"><span className="k">模式</span><span className="v">{auto ? '自动挡' : '专手动'}</span></div>
          </div>
        </div>
      </div>

      {/* ===== 完成庆祝 ===== */}
      {phase === 'done' && (
        <>
          <div className="card celebrate">
            <svg className="clapper clap" viewBox="0 0 48 48">
              <rect x="6" y="18" width="36" height="22" rx="4" fill="#171717" />
              <g className="board">
                <rect x="6" y="8" width="36" height="10" rx="3" fill="#171717" />
                <path d="M10 8 L14 18 M20 8 L24 18 M30 8 L34 18 M38 8 L40 15" stroke="#FAF9F7" strokeWidth="2.4" strokeLinecap="round" />
              </g>
            </svg>
            <div className="txt">
              <h3>成片已生成</h3>
              <p>全部 6 个阶段已完成，总耗时 {fmtElapsed(elapsed)}</p>
            </div>
            <Link className="btn btn-primary" href="/studio">进入工作台</Link>
          </div>
          <div className="done-banner show">
            <Icon name="check" />《{idea ? (idea.length > 14 ? idea.slice(0, 14) + '…' : idea) : '新项目'}》成片已生成 ·{' '}
            <Link href="/studio" style={{ textDecoration: 'underline' }}>立即观看</Link>
          </div>
          {videos.length > 0 && (
            <div className="card panel" style={{ marginTop: 16 }}>
              <h3><Icon name="play" />成片文件</h3>
              <div className="artifacts">
                {videos.map((v) => (
                  <a key={v} className="artifact" href={v} target="_blank" rel="noreferrer">
                    <Icon name="play" style={{ color: 'var(--green)' }} />
                    {v.split('/').pop()}
                    <span className="st">下载</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          {confetti.map((c, i) => (
            <i
              key={i}
              className="confetti-piece"
              style={{
                left: `${c.left}vw`,
                background: c.color,
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.duration}s`,
                borderRadius: c.round ? '50%' : undefined,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}

/* ============================================================
 * 演示模式：本地模拟（源自 waiting.html，P0 原型体验）
 * ============================================================ */

const SCRIPT_TEXT =
  '雨声敲打着便利店的玻璃窗。阿橘蹲在收银台旁，看着门口的风铃发呆。门开了，浑身湿透的青年收起伞，顿了顿——他也在等一个不会来的人。阿橘跳下台，蹭了蹭他的裤脚。';

const TASKS: string[] = [
  '正在绘制第 3 场「雨夜便利店」的分镜……',
  '正在为镜 6 写画面提示词：暖光货架间的猫……',
  '正在调整镜 4 的机位：从收银台摇到门口……',
  '正在统一第 3 场的色调：雨夜 + 暖灯的对比……',
];

const MINI_LOGS: string[] = [
  '分镜 5/8：机位与景别已定',
  '分镜 6/8：画面提示词生成完毕',
  '分镜 4/8：按剧本第 12 行修正台词时长',
  '色调统一：暖光 3200K 已应用到第 3 场',
];

type LogRow = [string, string, 0 | 1];
const LOGS: LogRow[] = [
  ['剧本策划', '已完成 · 8 场戏 · 主角「阿橘」人设定稿', 1],
  ['角色设计', '阿橘 / 店员小林 / 神秘客人 三视图完成', 1],
  ['场景设计', '雨夜便利店外景 + 内景 共 5 张完成', 1],
  ['分镜设计', '开始 · 目标 8 个镜头', 0],
  ['分镜 1/8', '画面提示词生成完毕', 1],
  ['分镜 2/8', '画面提示词生成完毕', 1],
  ['分镜 3/8', '加入剧本台词：你也在等人吗', 0],
  ['分镜 4/8', '机位从收银台摇到门口', 0],
  ['分镜 5/8', '画面提示词生成完毕', 1],
  ['参考图精修', '排队中 · 等待分镜阶段完成', 0],
  ['视频生成', '排队中 · 预计还需 12 分钟', 0],
];

type Tip = { k: string; p: string };
const TIPS: Tip[] = [
  { k: 'TIP 1 · 分镜', p: '「推、拉、摇、移」四个字就够了：想强调情绪用「推」，想交代环境用「拉」。雀跃的分镜提示词已内置这套语言。' },
  { k: 'TIP 2 · 提示词', p: '写画面时按「主体 + 动作 + 环境 + 光线 + 风格」五件套写，AI 出图稳定性提升一大截。你可以随时点进任一镜头改提示词。' },
  { k: 'TIP 3 · 省时', p: '视频生成阶段最久，建议先去忙别的——开了「完成后通知我」，成片好了雀跃会叫你。' },
  { k: 'TIP 4 · 省钱', p: '参考图阶段是最后的免费刹车点：不满意就重画，等视频跑完再返工，成本要高 5 倍。' },
];

const IDEA_CHIPS: string[] = [
  '下一集：便利店的午夜客人',
  '给阿橘加一句台词',
  '换个结局：猫先离开了',
  '同款风格做 15 秒预告',
  '旁白换成男声晚安版',
];

type Confetti = { left: number; color: string; delay: number; duration: number; round: boolean };
const CONFETTI_COLORS: string[] = ['#8B5CF6', '#3AA7F5', '#34B37B', '#F0A02E', '#EC6B9E'];

function fmtTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function DemoWaiting() {
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  const [etaSec, setEtaSec] = useState(7 * 60 + 42);
  const etaRef = useRef(7 * 60 + 42);
  const [totalPct, setTotalPct] = useState(46);
  const totalRef = useRef(46);

  const [nowTask, setNowTask] = useState(TASKS[0]);
  const [shots, setShots] = useState(5);
  const shotsRef = useRef(5);
  const taskIdxRef = useRef(0);

  const [miniLog, setMiniLog] = useState<{ t: string; text: string }[]>([]);
  const miniIdxRef = useRef(0);

  const [logs, setLogs] = useState<{ t: string; stage: string; text: string; ok: boolean }[]>([]);
  const logIdxRef = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);

  const [typed, setTyped] = useState('');
  const typeIdxRef = useRef(0);
  const [replayKey, setReplayKey] = useState(0);

  const [tipIdx, setTipIdx] = useState(0);

  const [notifyOn, setNotifyOn] = useState(true);

  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);

  const [confetti] = useState<Confetti[]>(() =>
    Array.from({ length: 60 }, () => ({
      left: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 0.8,
      duration: 1.8 + Math.random() * 1.2,
      round: Math.random() < 0.4,
    })),
  );

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    pausedRef.current = true;
    setFinished(true);
  }, []);

  /* ---- 1. ETA 倒计时 + 总进度缓行 + 倒计时归零自动庆祝 ---- */
  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      etaRef.current = Math.max(0, etaRef.current - 1);
      setEtaSec(etaRef.current);
      if (etaRef.current % 25 === 0 && totalRef.current < 96) {
        totalRef.current += 1;
        setTotalPct(totalRef.current);
      }
      if (etaRef.current === 0) finish();
    }, 1000);
    return () => clearInterval(id);
  }, [finish]);

  /* ---- 2. 分镜进度 + 当前任务文案 ---- */
  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      taskIdxRef.current = (taskIdxRef.current + 1) % TASKS.length;
      setNowTask(TASKS[taskIdxRef.current]);
      if (shotsRef.current < 8 && Math.random() < 0.4) {
        shotsRef.current += 1;
        setShots(shotsRef.current);
      }
    }, 4200);
    return () => clearInterval(id);
  }, []);

  /* ---- 3. 阶段微日志（保留最近 3 条） ---- */
  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      const text = MINI_LOGS[miniIdxRef.current % MINI_LOGS.length];
      miniIdxRef.current += 1;
      setMiniLog((prev) => [...prev, { t: fmtTime(new Date()), text }].slice(-3));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  /* ---- 4. 实时日志流（自动滚动到底） ---- */
  useEffect(() => {
    const push = () => {
      const item = LOGS[logIdxRef.current % LOGS.length];
      logIdxRef.current += 1;
      setLogs((prev) => [...prev, { t: fmtTime(new Date()), stage: item[0], text: item[1], ok: item[2] === 1 }].slice(-30));
    };
    push();
    const id = setInterval(() => {
      if (!pausedRef.current) push();
    }, 2600);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  /* ---- 5. 剧本预览 · 打字机 ---- */
  useEffect(() => {
    typeIdxRef.current = 0;
    setTyped('');
    const id = setInterval(() => {
      if (pausedRef.current) return;
      typeIdxRef.current += 1;
      if (typeIdxRef.current >= SCRIPT_TEXT.length) {
        setTyped(SCRIPT_TEXT);
        clearInterval(id);
      } else {
        setTyped(SCRIPT_TEXT.slice(0, typeIdxRef.current));
      }
    }, 65);
    return () => clearInterval(id);
  }, [replayKey]);

  /* ---- 6. 小课堂轮播 ---- */
  useEffect(() => {
    const id = setInterval(() => {
      setTipIdx((i) => (i + 1) % TIPS.length);
    }, 5200);
    return () => clearInterval(id);
  }, []);

  const togglePause = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  };
  const toggleNotify = () => setNotifyOn((n) => !n);

  const mm = String(Math.floor(etaSec / 60)).padStart(2, '0');
  const ss = String(etaSec % 60).padStart(2, '0');

  return (
    <div>
      {/* ===== 等待头部：ETA + 可控操作 ===== */}
      <div className="card wait-head">
        <div className="wait-cover">
          <Icon name="film" style={{ width: 40, height: 40 }} />
        </div>
        <div className="info">
          <h1>
            橘猫便利店 <span className="tag tag-blue"><span className="live-dot" />生成中</span>{' '}
            <span className="tag tag-gray">后台运行中</span>
          </h1>
          <p className="sub">短片创作 · 第 <b>3</b>/6 阶段：分镜设计 · 你可以随时离开，跑完通知你</p>
          <div className="eta-row">
            <div className="eta">
              <span className="label">预计还需</span>
              <span className="num">{mm}:<em>{ss}</em></span>
            </div>
            <div className="eta">
              <span className="label">总进度</span>
              <span className="num">{totalPct}%</span>
            </div>
            <div className="head-actions">
              <div className="switch-row">
                <div className={`switch${notifyOn ? ' on' : ''}`} onClick={toggleNotify} role="switch" aria-checked={notifyOn} />
                <Icon name="bell" className="ic ic-sm" style={{ color: 'var(--text-3)' }} />
                <span className="sub">完成后通知我</span>
              </div>
              <button className="btn btn-outline btn-sm" type="button" onClick={togglePause}>
                {paused ? (
                  <><Icon name="play" className="ic ic-sm" />继续</>
                ) : (
                  <><Icon name="pause" className="ic ic-sm" />暂停</>
                )}
              </button>
              <Link className="btn btn-ghost btn-sm" href="/">离开</Link>
            </div>
          </div>
          <div className="progress live"><div style={{ width: `${totalPct}%` }} /></div>
        </div>
      </div>

      <div className="wait-cols">
        {/* ===== 左列：阶段叙事流 + 预览先行 + 日志 ===== */}
        <div>
          <div className="card panel">
            <h3><Icon name="zap" />阶段叙事流<span className="more">每一步在干什么，都告诉你</span></h3>
            <div className="stage-flow">
              <div className="tl-node done">
                <div className="dot"><Icon name="check" /></div>
                <h4>① 剧本策划 <span className="tag tag-green">已完成</span></h4>
                <p className="desc">8 场戏 · 主角「阿橘」人设已定 · 用时 4 分钟</p>
              </div>

              <div className="tl-node done">
                <div className="dot"><Icon name="check" /></div>
                <h4>② 角色 / 场景设计 <span className="tag tag-green">已完成</span></h4>
                <p className="desc">3 个角色 + 5 个场景参考图已生成，可点右下角查看</p>
              </div>

              <div className="tl-node running">
                <div className="dot"><span className="spinner" /></div>
                <h4>③ 分镜设计 <span className="tag tag-blue">进行中</span></h4>
                <p className="desc">把剧本拆成可拍的镜头，逐个生成画面提示词</p>
                <div className="now"><span className="live-dot" /><span>{nowTask}</span></div>
                <div className="shot-progress">
                  <div className="progress live"><div style={{ width: `${(shots / 8) * 100}%` }} /></div>
                  <span className="n">镜头 {shots}/8</span>
                </div>
                <div className="mini-log">
                  {miniLog.map((m, i) => (
                    <div key={i}><span className="t">{m.t}</span>{m.text}</div>
                  ))}
                </div>
              </div>

              <div className="tl-node wait">
                <div className="dot">4</div>
                <h4>④ 参考图精修 <span className="tag tag-amber">排队中</span></h4>
                <p className="desc">预计 4 分钟后开始 · 分镜完成后自动衔接</p>
              </div>

              <div className="tl-node wait">
                <div className="dot">5</div>
                <h4>⑤ 视频生成 <span className="tag tag-gray">等待</span></h4>
                <p className="desc">8 个镜头逐个渲染，本阶段最耗时（约 12 分钟）</p>
              </div>

              <div className="tl-node wait">
                <div className="dot">6</div>
                <h4>⑥ 后期剪辑 <span className="tag tag-gray">等待</span></h4>
                <p className="desc">配乐、字幕、转场，出成片</p>
              </div>
            </div>
          </div>

          <div className="card panel" style={{ marginTop: 16 }}>
            <h3><Icon name="book" />预览先行 · 剧本已经能看了<span className="more">不等成片，先审内容</span></h3>
            <div className="preview-box">
              <div className="scene-tag"><Icon name="film" className="ic ic-sm" />第 3 场 · 雨夜便利店 · 内景</div>
              <p className="script">
                {typed}
                {typed.length < SCRIPT_TEXT.length && <span className="type-caret" />}
              </p>
              <div className="preview-actions">
                <Link className="btn btn-outline btn-sm" href="/studio">查看完整剧本</Link>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => setReplayKey((k) => k + 1)}>重播打字效果</button>
              </div>
            </div>
          </div>

          <div className="card panel" style={{ marginTop: 16 }}>
            <h3><Icon name="refresh" />实时日志<span className="more">导演组的工作记录</span></h3>
            <div className="log-stream" ref={logRef}>
              {logs.map((l, i) => (
                <div key={i}>
                  <span className="t">{l.t}</span>[{l.stage}] {l.text}
                  {l.ok ? <span className="ok"> ✓</span> : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ===== 右列：小课堂 / 灵感 / 已出产物 ===== */}
        <div>
          <div className="card panel">
            <h3><Icon name="wand" />等待不空转 · 导演小课堂</h3>
            <div className="tips">
              {TIPS.map((tip, i) => (
                <div key={tip.k} className={`tip-card${i === tipIdx ? ' on' : ''}`}>
                  <div className="k">{tip.k}</div>
                  <p>{tip.p}</p>
                </div>
              ))}
            </div>
            <div className="tips-dots">
              {TIPS.map((tip, i) => (
                <i key={tip.k} className={i === tipIdx ? 'on' : ''} onClick={() => setTipIdx(i)} />
              ))}
            </div>
          </div>

          <div className="card panel" style={{ marginTop: 16 }}>
            <h3><Icon name="sparkles" />等待时，来点灵感</h3>
            <div className="idea-chips">
              {IDEA_CHIPS.map((chip) => (
                <span key={chip} className="chip">{chip}</span>
              ))}
            </div>
          </div>

          <div className="card panel" style={{ marginTop: 16 }}>
            <h3><Icon name="image" />已出产物<span className="more">生成中也能反复看</span></h3>
            <div className="artifacts">
              <div className="artifact"><Icon name="book" style={{ color: 'var(--green)' }} />剧本 · 8 场<span className="st">可看</span></div>
              <div className="artifact"><Icon name="user" style={{ color: 'var(--green)' }} />角色 · 3 个<span className="st">可看</span></div>
              <div className="artifact"><Icon name="image" style={{ color: 'var(--green)' }} />场景 · 5 张<span className="st">可看</span></div>
              <div className="artifact lock"><Icon name="film" style={{ color: 'var(--text-3)' }} />分镜 · 5/8<span className="st">生成中</span></div>
              <div className="artifact lock"><Icon name="play" style={{ color: 'var(--text-3)' }} />成片<span className="st">未开始</span></div>
              <div className="artifact lock"><Icon name="zap" style={{ color: 'var(--text-3)' }} />预告切片<span className="st">未开始</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 完成庆祝 ===== */}
      <div className="card celebrate">
        <svg className={`clapper${finished ? ' clap' : ''}`} viewBox="0 0 48 48">
          <rect x="6" y="18" width="36" height="22" rx="4" fill="#171717" />
          <g className="board">
            <rect x="6" y="8" width="36" height="10" rx="3" fill="#171717" />
            <path d="M10 8 L14 18 M20 8 L24 18 M30 8 L34 18 M38 8 L40 15" stroke="#FAF9F7" strokeWidth="2.4" strokeLinecap="round" />
          </g>
        </svg>
        <div className="txt">
          <h3>等不及了？点这里模拟「成片完成」的那一刻</h3>
          <p>真实产品里这一刻会自动发生：场记板合上、彩带落下、成片直接可播</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={finish} disabled={finished}>
          {finished ? '已成片 ✓' : '模拟成片完成'}
        </button>
      </div>
      <div className={`done-banner${finished ? ' show' : ''}`}>
        <Icon name="check" />《橘猫便利店》第 1 集成片已生成 · 时长 1 分 42 秒 ·{' '}
        <Link href="/studio" style={{ textDecoration: 'underline' }}>立即观看</Link>
      </div>

      {finished &&
        confetti.map((c, i) => (
          <i
            key={i}
            className="confetti-piece"
            style={{
              left: `${c.left}vw`,
              background: c.color,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.duration}s`,
              borderRadius: c.round ? '50%' : undefined,
            }}
          />
        ))}
    </div>
  );
}

/* ============================================================
 * 页面入口：按 URL 参数选模式
 * ============================================================ */

export default function WaitingPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('session');
    if (sid) {
      window.sessionStorage.setItem('huejoy.session', sid);
      setSessionId(sid);
    } else {
      const stored = window.sessionStorage.getItem('huejoy.session');
      if (stored) setSessionId(stored);
    }
    setChecked(true);
  }, []);

  if (!checked) return null;
  return sessionId ? <RealWaiting sessionId={sessionId} /> : <DemoWaiting />;
}
