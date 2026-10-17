/**
 * 会话状态推导共享模块（首页「进行中的项目」与项目库共用）
 * 数据来源：GET /api/sessions → WorkflowState.to_dict()
 */

/** 后端 6 阶段 id → 中文名（与 waiting 页 FALLBACK_STAGES 一致） */
export const STAGE_NAMES: Record<string, string> = {
  init: '初始化',
  script_generation: '剧本生成',
  character_design: '角色设计',
  storyboard: '分镜设计',
  reference_generation: '参考图生成',
  video_generation: '视频生成',
  post_production: '后期制作',
};

export const STAGE_KEYS = Object.keys(STAGE_NAMES).filter((k) => k !== 'init');

export type ItemTab = 'running' | 'done' | 'failed' | 'idle';

export interface SessionStatusInfo {
  label: string;
  cls: string;
  tab: ItemTab;
}

/** 会话阶段状态 → 展示状态。优先级：失败 > 完成 > 待确认 > 生成中 > 待开始 */
export function deriveSessionStatus(status: Record<string, string>): SessionStatusInfo {
  const values = Object.entries(status)
    .filter(([k]) => k !== 'init')
    .map(([, v]) => v);
  if (values.some((v) => v === 'error')) return { label: '已失败', cls: 'tag-gray', tab: 'failed' };
  if (values.length > 0 && values.every((v) => v === 'completed')) return { label: '已完成', cls: 'tag-green', tab: 'done' };
  if (values.some((v) => v === 'waiting')) return { label: '待确认', cls: 'tag-amber', tab: 'running' };
  if (values.some((v) => v === 'running')) return { label: '生成中', cls: 'tag-blue', tab: 'running' };
  return { label: '待开始', cls: 'tag-gray', tab: 'idle' };
}

/** 会话总进度：已完成阶段数 + 当前运行阶段的部分进度，折算 0-100 */
export function sessionProgress(session: any): number {
  const done = STAGE_KEYS.filter((k) => session.status?.[k] === 'completed').length;
  const cur = session.current_stage as string;
  const pct = session.stage_progress?.[cur]?.percent;
  const extra = cur && cur !== 'init' && session.status?.[cur] === 'running' && typeof pct === 'number' ? pct / 100 : 0;
  return Math.min(100, Math.round(((done + extra) / STAGE_KEYS.length) * 100));
}

/** 是否「进行中」：任一阶段 running 或 waiting */
export function isSessionActive(session: any): boolean {
  return Object.entries(session.status ?? {})
    .filter(([k]) => k !== 'init')
    .some(([, v]) => v === 'running' || v === 'waiting');
}

/** 当前阶段中文名；init 回退「初始化」 */
export function sessionStageName(session: any): string {
  const cur = session.current_stage as string;
  return STAGE_NAMES[cur] ?? (cur === 'init' ? '初始化' : cur || '初始化');
}

/** 会话标题：title → idea → 兜底 */
export function sessionTitle(session: any): string {
  return session.title || session.idea || '未命名短片';
}
