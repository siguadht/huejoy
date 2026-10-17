/**
 * 工作流 API 客户端
 */

/**
 * API 基址。
 * 默认留空 = 走同源相对路径，由 Next.js rewrite 代理到后端：
 *   - 单一源，无 CORS 问题（后端 CORS 白名单只含 3000 端口，前端换端口即被拦）
 *   - 已验证 rewrite 对 SSE 是真正的流式转发（progress/heartbeat 按实时到达，不缓冲）
 *   - 旧注释称「代理会缓冲 SSE」经实测已不成立（Next 16 rewrite 为流式代理）
 * 仅当前后端分离部署（不同域）时，才用 NEXT_PUBLIC_API_URL 显式指定后端绝对地址，
 * 并需同时把前端域名加进后端 XYQ_CORS_ORIGINS。
 */
const STREAM_API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export interface StageInfo {
  id: string;
  name: string;
  order: number;
  description: string;
}

export interface ProjectStatus {
  session_id: string;
  current_stage: string;
  status: Record<string, string>;
  error: string | null;
}

export interface StreamEvent {
  type: 'progress' | 'heartbeat' | 'stage_complete' | 'error' | 'content';
  message?: string;
  phase?: string;
  step_desc?: string;
  percent?: number;
  stage?: string;
  status?: string;
  requires_intervention?: boolean;
  payload_summary?: any;
  content?: string;
  time?: number;
  data?: any;
}

export interface PipelineTask {
  task_id: string;
  pipeline: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | string;
  progress?: number;
  message?: string;
  input?: Record<string, any>;
  output?: Record<string, any>;
  artifacts?: Array<{ kind: string; name?: string; path: string; exists?: boolean; created_at?: string }>;
  error?: string | null;
  created_at?: string;
  updated_at?: string;
  output_dir?: string;
}

export interface SandboxTask {
  id: string;
  tool: string;
  model: string;
  input?: Record<string, any>;
  status: string;
  progress?: number;
  created_at?: string;
}

export interface PipelineStartResponse {
  task_id: string;
  pipeline: string;
  status: string;
  metadata_url: string;
  output_dir: string;
}

export interface PipelineTaskEvent {
  type: 'snapshot' | 'progress' | 'artifact' | 'completed' | 'failed';
  task_id: string;
  status?: string;
  progress?: number;
  artifact?: { kind: string; name?: string; path: string; exists?: boolean; created_at?: string };
}

export interface ApiModelOption {
  id: string;
  label: string;
  provider: string;
  family?: string;
  media_type?: 'image' | 'video';
  model_type?: 'llm' | 'vlm' | 't2i' | 'i2i' | 'video';
  type?: string[];
  ability_type?: string;
  ability_types?: string[];
  adapter_ability_types?: string[];
  input_modalities?: string[];
  adapter_input_modalities?: string[];
  api_contract_verified?: boolean;
  capabilities?: Record<string, any>;
}

export interface StandardTemplateOption {
  id: string;
  name: string;
  label: string;
  size: string;
  ratio: '9:16' | '1:1' | '16:9' | string;
  width: number;
  height: number;
  media_width: number;
  media_height: number;
  media_ratio: string;
  media_resolution: string;
  supports_video?: boolean;
  fields: Array<{ key: string; type: string; default: string }>;
  preview_url: string;
}

async function requireOkResponse(response: Response, fallbackMessage: string): Promise<Response> {
  if (response.ok) return response;

  const payload = await response.json().catch(() => null);
  const detail = typeof payload?.detail === 'string' ? payload.detail : fallbackMessage;
  throw new Error(`${detail} (HTTP ${response.status})`);
}

/* ============ A 项：studio 工作台真实产物（2026-10-12 新增） ============ */

/** 后端返回的媒体路径（如 code/result/image/{sid}/Assets/...）→ 同源 URL（/code 静态挂载） */
export function mediaUrl(path: string | undefined | null): string {
  if (!path) return '';
  const clean = path.replace(/^\.?\//, '');
  return `/${clean}`;
}

/** 剧本产物（GET /api/project/{id}/artifact/script_generation） */
export interface ScriptArtifact {
  title?: string;
  logline?: string;
  genre?: string[];
  mood?: string;
  characters?: Array<{ name: string; description?: string; species?: string; character_id?: string }>;
  settings?: Array<{ name: string; description?: string; setting_id?: string }>;
  episodes?: Array<{ episode_number: number; act_title?: string; content?: string }>;
  meta?: { generation_model?: string; generation_prompt?: string };
}

/** 角色/场景设计产物：selected 为选中图路径，versions 为全部版本 */
export interface DesignAsset {
  id: string;
  name: string;
  description?: string;
  selected?: string;
  versions?: string[];
  status?: string;
}

export interface CharacterDesignArtifact {
  characters?: DesignAsset[];
  settings?: DesignAsset[];
}

/** 分镜产物：episodes → segments → shots */
export interface StoryboardShot {
  shot_number: number;
  shot_type?: string;
  duration?: number;
  content?: string;
}

export interface StoryboardSegment {
  segment_id: string;
  segment_number?: number;
  total_duration?: number;
  location?: string;
  characters?: string[];
  shots?: StoryboardShot[];
  scene_time?: string;
  scene_space?: string;
  scene_context?: string;
}

export interface StoryboardArtifact {
  episodes?: Array<{ episode_number: number; episode_title?: string; segments?: StoryboardSegment[] }>;
}

/** 参考图产物：每个分镜一张头图 */
export interface ReferenceScene {
  id: string;
  name?: string;
  index?: number;
  description?: string;
  visual_prompt?: string;
  selected?: string;
  versions?: string[];
  status?: string;
}

export interface ReferenceArtifact {
  scenes?: ReferenceScene[];
}

/** 视频产物：每个分镜一条片段 */
export interface VideoClip {
  id: string;
  name?: string;
  episode?: number;
  index?: number;
  description?: string;
  duration?: number;
  selected?: string;
  versions?: string[];
  status?: string;
}

export interface VideoArtifact {
  clips?: VideoClip[];
}

/** 后期产物：最终成片 */
export interface PostProductionArtifact {
  final_videos?: Array<{ episode: number; path: string; name?: string }>;
  final_video?: string;
}

export interface SessionArtifacts {
  script_generation: ScriptArtifact | null;
  character_design: CharacterDesignArtifact | null;
  storyboard: StoryboardArtifact | null;
  reference_generation: ReferenceArtifact | null;
  video_generation: VideoArtifact | null;
  post_production: PostProductionArtifact | null;
}

const ARTIFACT_STAGES = [
  'script_generation',
  'character_design',
  'storyboard',
  'reference_generation',
  'video_generation',
  'post_production',
] as const;

/**
 * 并行拉取六阶段产物。单阶段失败（未生成/接口异常）返回 null，不阻塞其他阶段——
 * studio 页按「有哪些数据渲染哪些」的诚实策略展示。
 */
export async function fetchSessionArtifacts(sessionId: string): Promise<SessionArtifacts> {
  const results = await Promise.all(
    ARTIFACT_STAGES.map((stage) =>
      fetch(`/api/project/${sessionId}/artifact/${stage}`)
        .then((resp) => (resp.ok ? resp.json() : null))
        .then((data) => (data?.artifact ?? null) as any)
        .catch(() => null),
    ),
  );
  return {
    script_generation: results[0],
    character_design: results[1],
    storyboard: results[2],
    reference_generation: results[3],
    video_generation: results[4],
    post_production: results[5],
  };
}

export async function fetchStages(): Promise<StageInfo[]> {
  const resp = await fetch('/api/stages');
  await requireOkResponse(resp, '获取工作流阶段失败');
  const data = await resp.json();
  return data.stages;
}

export async function fetchSessions(): Promise<any[]> {
  const resp = await fetch('/api/sessions');
  await requireOkResponse(resp, '获取会话列表失败');
  const data = await resp.json();
  return data.sessions || [];
}

/* ============ P2 真实链路辅助（雀跃落地新增） ============ */

/** 后端健康探测：不可达时前端回退演示模式 */
export async function fetchHealth(): Promise<boolean> {
  try {
    const resp = await fetch('/api/health');
    return resp.ok;
  } catch {
    return false;
  }
}

/** startProject 所需模型字段；任一类缺失都会被后端 400 拒绝 */
export interface ModelSelection {
  llm_model: string;
  vlm_model: string;
  image_t2i_model: string;
  image_it2i_model: string;
  video_model: string;
  video_first_frame_model: string;
  video_reference_model: string;
  video_generation_mode: string;
}

/**
 * 从 /api/models 拉取模型注册表，按类型挑选默认模型。
 * 返回 null 表示后端模型注册表不可用（通常意味着未配置 API Key），
 * 调用方应引导用户去设置页配置，而不是发起注定失败的创作。
 */
export async function pickDefaultModels(): Promise<ModelSelection | null> {
  try {
    const [llm, vlm, t2i, i2i, video] = await Promise.all([
      fetchApiModels({ modelType: 'llm' }),
      fetchApiModels({ modelType: 'vlm' }),
      fetchApiModels({ modelType: 't2i' }),
      fetchApiModels({ modelType: 'i2i' }),
      fetchApiModels({ modelType: 'video' }),
    ]);
    const first = (list: ApiModelOption[]) => list[0]?.id ?? '';
    // 参考生视频（r2v）：动作迁移需要它做「角色图 + 动作视频」的组合，优先从视频表里挑
    const referenceModel = video.find((m) => /r2v/i.test(m.id))?.id ?? first(video);
    const sel: ModelSelection = {
      llm_model: first(llm),
      vlm_model: first(vlm),
      image_t2i_model: first(t2i),
      image_it2i_model: first(i2i),
      video_model: first(video),
      video_first_frame_model: first(video),
      video_reference_model: referenceModel,
      video_generation_mode: 'first_frame',
    };
    const ok = sel.llm_model && sel.vlm_model && sel.image_t2i_model && sel.image_it2i_model && sel.video_first_frame_model;
    return ok ? sel : null;
  } catch {
    return null;
  }
}

/** 阶段状态快照（GET /api/project/{id}/status → WorkflowState.to_dict） */
export interface SessionSnapshot {
  session_id: string;
  current_stage: string;
  status: Record<string, string>;
  error: string | null;
  artifacts: Record<string, any>;
  meta: Record<string, any>;
  stage_progress: Record<string, any>;
  updated_at: string;
}

export async function getSessionSnapshot(sessionId: string): Promise<SessionSnapshot> {
  const resp = await fetch(`/api/project/${sessionId}/status`);
  if (!resp.ok) throw new Error(`会话不存在或已过期 (HTTP ${resp.status})`);
  return resp.json();
}

/**
 * 驱动单个阶段的 SSE 执行流。
 * executeStage 经同源代理请求 SSE 流（rewrite 流式转发，实测不缓冲）。
 * 回调：onProgress 每个 progress 事件；onComplete 阶段终止（stage_complete）；
 * onError 阶段异常（error 事件或流中断）。
 */
export async function runStageStream(
  sessionId: string,
  stage: string,
  inputData: Record<string, any>,
  handlers: {
    onProgress?: (ev: StreamEvent) => void;
    onComplete?: (ev: StreamEvent) => void;
    onError?: (message: string) => void;
  },
): Promise<void> {
  let response: Response;
  try {
    response = await executeStage(sessionId, stage, inputData);
  } catch (err) {
    handlers.onError?.(err instanceof Error ? err.message : `阶段 ${stage} 启动失败`);
    return;
  }
  try {
    for await (const ev of parseStreamEvents(response)) {
      if (ev.type === 'progress') handlers.onProgress?.(ev);
      else if (ev.type === 'stage_complete') handlers.onComplete?.(ev);
      else if (ev.type === 'error') handlers.onError?.(ev.content || '阶段执行失败');
    }
  } catch (err) {
    handlers.onError?.(err instanceof Error ? err.message : '事件流中断');
  }
}

async function postPipelineTask(path: string, params: Record<string, any>): Promise<PipelineStartResponse> {
  const resp = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: '启动任务失败' }));
    throw new Error(err.detail || '启动任务失败');
  }
  return resp.json();
}

export async function startStandardPipeline(params: Record<string, any>): Promise<PipelineStartResponse> {
  return postPipelineTask('/api/pipelines/standard/tasks', params);
}

export async function startActionTransferPipeline(params: Record<string, any>): Promise<PipelineStartResponse> {
  return postPipelineTask('/api/pipelines/action_transfer/tasks', params);
}

export async function startDigitalHumanPipeline(params: Record<string, any>): Promise<PipelineStartResponse> {
  return postPipelineTask('/api/pipelines/digital_human/tasks', params);
}

export async function startImageAnimatePipeline(params: Record<string, any>): Promise<PipelineStartResponse> {
  return postPipelineTask('/api/pipelines/image_animate/tasks', params);
}

export async function startMemeFactoryPipeline(params: Record<string, any>): Promise<PipelineStartResponse> {
  return postPipelineTask('/api/pipelines/meme_factory/tasks', params);
}

export async function startVideoUnderstandPipeline(params: Record<string, any>): Promise<PipelineStartResponse> {
  return postPipelineTask('/api/pipelines/video_understand/tasks', params);
}

export async function startSongMvPipeline(params: Record<string, any>): Promise<PipelineStartResponse> {
  return postPipelineTask('/api/pipelines/song_mv/tasks', params);
}

export async function startAudioBookPipeline(params: Record<string, any>): Promise<PipelineStartResponse> {
  return postPipelineTask('/api/pipelines/audio_book/tasks', params);
}

export async function fetchPipelineTasks(limit = 100): Promise<PipelineTask[]> {
  const resp = await fetch(`/api/tasks?limit=${limit}`);
  if (!resp.ok) throw new Error('获取任务历史失败');
  const data = await resp.json();
  return data.tasks || [];
}

export async function fetchPipelineTask(taskId: string): Promise<PipelineTask> {
  const resp = await fetch(`/api/tasks/${taskId}`);
  if (!resp.ok) throw new Error('获取任务状态失败');
  return resp.json();
}

export async function fetchSandboxTasks(): Promise<SandboxTask[]> {
  const resp = await fetch('/api/sandbox/tasks');
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.tasks || [];
}

export async function clearTempCache(): Promise<{ status: string; deleted: number; freed_bytes?: number; freed_mb?: number; errors?: Array<{ path: string; error: string }> }> {
  const resp = await fetch('/api/cache/temp', { method: 'DELETE' });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: '清空缓存失败' }));
    throw new Error(err.detail || '清空缓存失败');
  }
  return resp.json();
}

export async function deletePipelineTask(taskId: string): Promise<void> {
  const resp = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
  if (!resp.ok) throw new Error('删除任务失败');
}

export async function fetchApiModels(params: {
  mediaType?: 'image' | 'video';
  modelType?: 'llm' | 'vlm' | 't2i' | 'i2i' | 'video';
  ability?: string;
  verifiedOnly?: boolean;
} = {}): Promise<ApiModelOption[]> {
  const search = new URLSearchParams();
  if (params.mediaType) search.set('media_type', params.mediaType);
  if (params.modelType) search.set('model_type', params.modelType);
  if (params.ability) search.set('ability', params.ability);
  if (params.verifiedOnly) search.set('verified_only', 'true');
  const resp = await fetch(`/api/models${search.toString() ? `?${search.toString()}` : ''}`);
  if (!resp.ok) throw new Error('获取模型列表失败');
  const data = await resp.json();
  return data.models || [];
}

export async function fetchStandardTemplates(): Promise<StandardTemplateOption[]> {
  const resp = await fetch('/api/pipelines/standard/templates');
  if (!resp.ok) throw new Error('获取模版列表失败');
  const data = await resp.json();
  return data.templates || [];
}

export async function uploadMedia(file: File): Promise<{ filename: string; file_path: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const resp = await fetch('/api/upload_media', {
    method: 'POST',
    body: formData,
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: '上传失败' }));
    throw new Error(err.detail || '上传失败');
  }
  return resp.json();
}

export async function uploadArtifactImage(
  sessionId: string,
  stage: string,
  itemType: string,
  itemId: string,
  file: File,
): Promise<{ status: string; path: string; artifact: any; status_map: Record<string, string> }> {
  const formData = new FormData();
  formData.append('item_type', itemType);
  formData.append('item_id', itemId);
  formData.append('file', file);
  const resp = await fetch(`/api/project/${sessionId}/artifact/${stage}/upload_image`, {
    method: 'POST',
    body: formData,
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: '上传图片失败' }));
    throw new Error(err.detail || '上传图片失败');
  }
  return resp.json();
}

export function subscribePipelineTask(
  taskId: string,
  onEvent: (event: PipelineTaskEvent) => void,
  onError?: () => void,
): () => void {
  const source = new EventSource(`${STREAM_API_BASE}/api/tasks/${taskId}/events`);
  source.onmessage = event => {
    try {
      onEvent(JSON.parse(event.data));
    } catch {
      // Ignore malformed stream events.
    }
  };
  source.onerror = () => {
    onError?.();
    source.close();
  };
  return () => source.close();
}

export async function startProject(params: {
  idea: string;
  file_path?: string;
  style?: string;
  video_ratio?: string;
  video_resolution?: string;
  llm_model?: string;
  vlm_model?: string;
  image_t2i_model?: string;
  image_it2i_model?: string;
  video_model?: string;
  video_first_frame_model?: string;
  video_start_end_model?: string;
  video_reference_model?: string;
  video_generation_mode?: string;
  scene_number?: number;
  enable_concurrency?: boolean;
  web_search?: boolean;
  expand_idea?: boolean;
  episodes?: number;
}): Promise<{ session_id: string; status: string; params: any }> {
  const resp = await fetch('/api/project/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: '项目创建失败' }));
    throw new Error(err.detail || '项目创建失败');
  }
  return resp.json();
}

export async function getProjectStatus(sessionId: string): Promise<ProjectStatus> {
  const resp = await fetch(`/api/project/${sessionId}/status`);
  if (!resp.ok) throw new Error('Failed to get project status');
  return resp.json();
}

// 兼容旧路由名；后端实际会通过统一的 workflow state 入口返回状态。
export async function getProjectStatusFromDisk(sessionId: string): Promise<any> {
  const resp = await fetch(`/api/project/${sessionId}/status/from_disk`);
  if (!resp.ok) throw new Error('Failed to get project status snapshot');
  return resp.json();
}

export async function getArtifact(sessionId: string, stage: string): Promise<any> {
  const resp = await fetch(`/api/project/${sessionId}/artifact/${stage}`);
  if (!resp.ok) throw new Error(`Artifact for stage '${stage}' not found`);
  return resp.json();
}

export async function checkSceneAssets(sessionId: string, sceneNumber: number): Promise<{
  scene_number: number;
  reference_images: number;
  videos: number;
  shot_count: number;
}> {
  const resp = await fetch(`/api/project/${sessionId}/scene/${sceneNumber}/assets`);
  if (!resp.ok) return { scene_number: sceneNumber, reference_images: 0, videos: 0, shot_count: 0 };
  return resp.json();
}

export async function executeStage(
  sessionId: string,
  stage: string,
  inputData: Record<string, any> = {},
  signal?: AbortSignal,
): Promise<Response> {
  const response = await fetch(`${STREAM_API_BASE}/api/project/${sessionId}/execute/${stage}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inputData),
    signal,
  });
  return requireOkResponse(response, `阶段 ${stage} 启动失败`);
}

export async function intervene(
  sessionId: string,
  stage: string,
  modifications: Record<string, any>,
): Promise<Response> {
  // 同源代理请求（rewrite 流式转发，无需直连后端、无 CORS）
  const response = await fetch(`${STREAM_API_BASE}/api/project/${sessionId}/intervene`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage, modifications }),
  });
  return requireOkResponse(response, `阶段 ${stage} 修改失败`);
}

export async function stopProject(sessionId: string): Promise<{ status: string }> {
  const resp = await fetch(`/api/project/${sessionId}/stop`, {
    method: 'POST',
  });
  await requireOkResponse(resp, '停止项目失败');
  return resp.json();
}

export async function updateModels(
  sessionId: string,
  models: Partial<Record<string, string | boolean>>,
): Promise<{ status: string }> {
  const resp = await fetch(`/api/project/${sessionId}/models`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(models),
  });
  await requireOkResponse(resp, '更新项目模型失败');
  return resp.json();
}

export async function deleteSession(
  sessionId: string,
): Promise<{ status: string }> {
  const resp = await fetch(`/api/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: '删除失败' }));
    throw new Error(err.detail || '删除失败');
  }
  return resp.json();
}

export async function saveSelections(
  sessionId: string,
  stage: string,
  selections: Record<string, any>,
): Promise<{ status: string }> {
  const resp = await fetch(`/api/project/${sessionId}/artifact/${stage}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(selections),
  });
  if (!resp.ok) throw new Error('保存选项失败');
  return resp.json();
}

export async function continueWorkflow(sessionId: string): Promise<{ status: string; next_stage?: string }> {
  const resp = await fetch(`/api/project/${sessionId}/continue`, {
    method: 'POST',
  });
  await requireOkResponse(resp, '继续工作流失败');
  return resp.json();
}

export async function* parseStreamEvents(response: Response): AsyncGenerator<StreamEvent> {
  if (!response.body) throw new Error('阶段事件流没有响应体');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let terminalEventReceived = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // keep incomplete trailing line in buffer
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event: StreamEvent = JSON.parse(line);
        if (event.type === 'stage_complete' || event.type === 'error') terminalEventReceived = true;
        if (event.type !== 'heartbeat') yield event;
      } catch { /* skip malformed */ }
    }
  }
  // Process any remaining data in buffer after stream ends
  if (buffer.trim()) {
    try {
      const event: StreamEvent = JSON.parse(buffer);
      if (event.type === 'stage_complete' || event.type === 'error') terminalEventReceived = true;
      if (event.type !== 'heartbeat') yield event;
    } catch { /* skip malformed */ }
  }
  if (!terminalEventReceived) {
    throw new Error('阶段事件流提前结束，未收到完成或错误事件');
  }
}
