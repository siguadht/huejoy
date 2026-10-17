'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { fetchApiModels, fetchHealth, type ApiModelOption } from '@/lib/workflowApi';

/* ============ 设置页：后端真实配置（config.yaml）+ 关于 ============ */

interface ConfigShape {
  api_providers?: Record<string, Record<string, any>>;
  models?: Record<string, string>;
  generation?: Record<string, string>;
  server?: Record<string, any>;
}

const SECRET_MASK = '********';

const PROVIDERS: Array<{ key: string; label: string; fields: Array<{ key: string; label: string; secret?: boolean }> }> = [
  { key: 'dashscope', label: '阿里云百炼 DashScope（通义千问 / 万相视频）', fields: [{ key: 'api_key', label: 'API Key', secret: true }] },
  { key: 'openai', label: 'OpenAI', fields: [{ key: 'api_key', label: 'API Key', secret: true }, { key: 'base_url', label: 'Base URL' }] },
  { key: 'gemini', label: 'Google Gemini', fields: [{ key: 'api_key', label: 'API Key', secret: true }] },
  { key: 'deepseek', label: 'DeepSeek', fields: [{ key: 'api_key', label: 'API Key', secret: true }] },
  { key: 'ark', label: '火山引擎 Ark（豆包）', fields: [{ key: 'api_key', label: 'API Key', secret: true }] },
  { key: 'kling', label: '可灵 Kling', fields: [{ key: 'access_key', label: 'Access Key', secret: true }, { key: 'secret_key', label: 'Secret Key', secret: true }] },
];

const MODEL_FIELDS: Array<{ key: string; label: string; type: 'llm' | 'vlm' | 't2i' | 'i2i' | 'video' }> = [
  { key: 'llm', label: '剧本 / 策划 LLM', type: 'llm' },
  { key: 'vlm', label: '视觉理解 VLM', type: 'vlm' },
  { key: 'image_t2i', label: '文生图', type: 't2i' },
  { key: 'image_it2i', label: '图生图', type: 'i2i' },
  { key: 'video_first_frame', label: '视频（首帧生视频）', type: 'video' },
  { key: 'video_start_end', label: '视频（首尾帧）', type: 'video' },
  { key: 'video_reference', label: '视频（参考生视频）', type: 'video' },
  { key: 'video', label: '视频（通用）', type: 'video' },
];

const RATIOS = ['16:9', '9:16', '1:1'];
const RESOLUTIONS = ['720P', '1080P'];
const VIDEO_MODES = ['first_frame', 'start_end_frame', 'reference'];

function ModelSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ApiModelOption[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">未选择</option>
        {options.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label || m.id}{m.provider ? ` · ${m.provider}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function SettingsPage() {
  const [config, setConfig] = useState<ConfigShape>({});
  const [models, setModels] = useState<Record<string, ApiModelOption[]>>({});
  const [backendUp, setBackendUp] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  /* ---- 加载配置 + 模型注册表 ---- */
  useEffect(() => {
    let alive = true;
    (async () => {
      const ok = await fetchHealth();
      if (alive) setBackendUp(ok);
      if (!ok) {
        setLoaded(true);
        return;
      }
      try {
        const [cfg, llm, vlm, t2i, i2i, video] = await Promise.all([
          fetch('/api/config').then((r) => r.json()),
          fetchApiModels({ modelType: 'llm' }),
          fetchApiModels({ modelType: 'vlm' }),
          fetchApiModels({ modelType: 't2i' }),
          fetchApiModels({ modelType: 'i2i' }),
          fetchApiModels({ modelType: 'video' }),
        ]);
        if (!alive) return;
        setConfig(cfg.config ?? {});
        setModels({ llm, vlm, t2i, i2i, video });
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : '配置加载失败');
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setProviderField = useCallback((provider: string, field: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      api_providers: {
        ...(prev.api_providers ?? {}),
        [provider]: { ...((prev.api_providers ?? {})[provider] ?? {}), [field]: value },
      },
    }));
    setSaved(false);
  }, []);

  const setModelField = useCallback((field: string, value: string) => {
    setConfig((prev) => ({ ...prev, models: { ...(prev.models ?? {}), [field]: value } }));
    setSaved(false);
  }, []);

  const setGenField = useCallback((field: string, value: string) => {
    setConfig((prev) => ({ ...prev, generation: { ...(prev.generation ?? {}), [field]: value } }));
    setSaved(false);
  }, []);

  /* ---- 保存：PUT /api/config（掩码值会被后端用原值顶回，不会误清空 key） ---- */
  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const resp = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: config }),
      });
      if (!resp.ok) throw new Error(`保存失败 (HTTP ${resp.status})`);
      const data = await resp.json();
      setConfig(data.config ?? config);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>加载中…</div>;
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <div className="page-head">
        <h1>设置</h1>
        <p className="sub">密钥保存于后端 .env（环境变量优先，覆盖 config.yaml），模型与偏好存 config.yaml，重启不丢失。</p>
      </div>

      {/* ===== 后端连接状态 ===== */}
      <div className="card panel" style={{ marginBottom: 16 }}>
        <h3><Icon name="zap" />后端连接</h3>
        <div className="kv" style={{ marginTop: 10 }}>
          <span className="k">API 服务</span>
          <span className="v">
            {backendUp ? (
              <span className="tag tag-green"><span className="live-dot" />已连接</span>
            ) : (
              <span className="tag tag-red">未连接</span>
            )}
          </span>
        </div>
        <div className="kv">
          <span className="k">前端代理地址</span>
          <span className="v" style={{ fontSize: 12 }}>/api → http://127.0.0.1:8000（BACKEND_API_URL 可改）</span>
        </div>
        {backendUp === false && (
          <p className="desc" style={{ marginTop: 10 }}>
            后端未运行。启动方式：<code style={{ fontSize: 12 }}>cd xiaoyunque/xiaoyunque-main/xiaoyunque/xiaoyunque/backend &amp;&amp; .venv/bin/python api_server.py</code>（默认端口 8000）。
          </p>
        )}
      </div>

      {/* ===== API Key ===== */}
      <div className="card panel" style={{ marginBottom: 16 }}>
        <h3><Icon name="settings" />API Key</h3>
        <p className="desc" style={{ margin: '6px 0 12px' }}>
          Key 只写入本机后端的 .env 文件，不会上传到任何第三方。已配置的 Key 显示为 {SECRET_MASK}，留空即保持原值。
        </p>
        {PROVIDERS.map((p) => (
          <div key={p.key} style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{p.label}</div>
            {p.fields.map((f) => {
              const cur = (config.api_providers?.[p.key] ?? {})[f.key];
              return (
                <div className="field" key={f.key}>
                  <label>{f.label}</label>
                  <input
                    className="input"
                    type={f.secret ? 'password' : 'text'}
                    value={cur ?? ''}
                    placeholder={f.secret && cur === SECRET_MASK ? '已配置，输入新值可替换' : ''}
                    onChange={(e) => setProviderField(p.key, f.key, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ===== 默认模型 ===== */}
      <div className="card panel" style={{ marginBottom: 16 }}>
        <h3><Icon name="grid" />默认模型</h3>
        <p className="desc" style={{ margin: '6px 0 12px' }}>
          创作台与各技能开拍时默认使用这里的模型；工作台内仍可临时改。列表来自后端模型注册表（/api/models）。
        </p>
        {MODEL_FIELDS.map((f) => (
          <ModelSelect
            key={f.key}
            label={f.label}
            value={config.models?.[f.key] ?? ''}
            options={models[f.type] ?? []}
            onChange={(v) => setModelField(f.key, v)}
          />
        ))}
      </div>

      {/* ===== 生成偏好 ===== */}
      <div className="card panel" style={{ marginBottom: 16 }}>
        <h3><Icon name="film" />生成偏好</h3>
        <div className="field">
          <label>默认风格</label>
          <input
            className="input"
            value={config.generation?.style ?? ''}
            placeholder="例如：realistic / anime"
            onChange={(e) => setGenField('style', e.target.value)}
          />
        </div>
        <div className="field">
          <label>默认画面比例</label>
          <select className="select" value={config.generation?.video_ratio ?? '16:9'} onChange={(e) => setGenField('video_ratio', e.target.value)}>
            {RATIOS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>默认分辨率</label>
          <select className="select" value={config.generation?.video_resolution ?? '720P'} onChange={(e) => setGenField('video_resolution', e.target.value)}>
            {RESOLUTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>视频生成方式</label>
          <select className="select" value={config.generation?.video_generation_mode ?? 'first_frame'} onChange={(e) => setGenField('video_generation_mode', e.target.value)}>
            {VIDEO_MODES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ===== 保存 ===== */}
      {error && (
        <div className="notice notice-error" style={{ marginBottom: 12 }}>
          <Icon name="alert" className="ic ic-sm" />
          <span>{error}</span>
        </div>
      )}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24 }}>
        <button className="btn btn-primary btn-lg" type="button" onClick={handleSave} disabled={saving || backendUp === false}>
          {saving ? '保存中…' : '保存配置'}
        </button>
        {saved && <span className="tag tag-green">已保存 ✓</span>}
      </div>

      {/* ===== 关于 ===== */}
      <div className="card panel">
        <h3><Icon name="star" />关于雀跃 HueJoy</h3>
        <div className="kv" style={{ marginTop: 10 }}><span className="k">产品</span><span className="v">雀跃 HueJoy · AI 短片创作工具</span></div>
        <div className="kv"><span className="k">前端</span><span className="v">Next.js 16 + React 19</span></div>
        <div className="kv"><span className="k">后端</span><span className="v">FastAPI 工作流引擎（6 阶段 Agent + 可插拔管线）</span></div>
        <div className="kv"><span className="k">开源血缘</span><span className="v" style={{ fontSize: 13 }}>基于 HITsz-TMG FilmAgent（MIT）二次开发 · 保留上游版权声明</span></div>
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>实验室 · 内测玩法，不进入主流程</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link className="btn btn-ghost btn-sm" href="/lab/casino">灵感赌场</Link>
            <Link className="btn btn-ghost btn-sm" href="/lab/asset-forge">资产车间</Link>
            <Link className="btn btn-ghost btn-sm" href="/lab/remix">Remix 工作台</Link>
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
          <Link className="btn btn-outline btn-sm" href="/brand">品牌定稿</Link>
          <Link className="btn btn-ghost btn-sm" href="/">回到创作台</Link>
        </div>
      </div>
    </div>
  );
}
