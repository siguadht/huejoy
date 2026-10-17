'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import {
  pickDefaultModels,
  startActionTransferPipeline,
  startAudioBookPipeline,
  startDigitalHumanPipeline,
  startImageAnimatePipeline,
  startMemeFactoryPipeline,
  startSongMvPipeline,
  startStandardPipeline,
  startVideoUnderstandPipeline,
  subscribePipelineTask,
  uploadMedia,
  type PipelineStartResponse,
  type PipelineTask,
  type PipelineTaskEvent,
} from '@/lib/workflowApi';
import { getSkillForm, type FieldDef } from '@/data/skillForms';

/** 产物路径 → 可访问地址（后端 /code 静态挂载） */
function toCodeUrl(path: string): string {
  const idx = path.indexOf('/code/');
  if (idx >= 0) return path.slice(idx);
  return path.startsWith('/') ? path : `/code/${path}`;
}

function Field({
  def,
  value,
  onChange,
  disabled,
}: {
  def: FieldDef;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_path } = await uploadMedia(file);
      onChange(file_path);
    } catch (err) {
      alert(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  if (def.type === 'image' || def.type === 'video' || def.type === 'audio') {
    return (
      <div className="field">
        <label>{def.label}{def.required && <span style={{ color: 'var(--red)' }}> *</span>}</label>
        <div className="dropzone" onClick={() => !disabled && fileRef.current?.click()} style={{ opacity: disabled ? 0.6 : 1 }}>
          <Icon name="upload" />
          <b>{uploading ? '上传中…' : value ? '已上传，点击更换' : '拖拽或点击上传'}</b>
          <span>{def.hint || (def.type === 'image' ? 'JPG / PNG，单张不超过 10MB' : def.type === 'audio' ? 'MP3 / WAV / M4A，作为 MV 主音轨' : 'MP4 / MOV')}</span>
          {value && <span style={{ fontSize: 11, color: 'var(--green)' }}>{value.split('/').pop()}</span>}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={def.type === 'image' ? 'image/*' : def.type === 'audio' ? 'audio/*' : 'video/*'}
          style={{ display: 'none' }}
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
      </div>
    );
  }

  if (def.type === 'textarea') {
    return (
      <div className="field">
        <label>{def.label}{def.required && <span style={{ color: 'var(--red)' }}> *</span>}</label>
        <textarea
          className="textarea"
          rows={4}
          value={value}
          disabled={disabled}
          placeholder={def.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        {def.hint && <div className="hint">{def.hint}</div>}
      </div>
    );
  }

  if (def.type === 'select') {
    if (def.multiple) {
      // 多选：值以逗号分隔存储，渲染为可点选标签
      const selected = value ? value.split(',').filter(Boolean) : [];
      const toggle = (opt: string) => {
        const next = selected.includes(opt)
          ? selected.filter((o) => o !== opt)
          : [...selected, opt];
        onChange(next.join(','));
      };
      return (
        <div className="field">
          <label>{def.label}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(def.options ?? []).map((o) => (
              <button
                key={o}
                type="button"
                className={`tag${selected.includes(o) ? ' tag-primary' : ''}`}
                style={{ cursor: 'pointer', opacity: disabled ? 0.6 : 1, border: '1px solid var(--border)' }}
                disabled={disabled}
                onClick={() => toggle(o)}
              >
                {o}
              </button>
            ))}
          </div>
          {def.hint && <div className="hint">{def.hint}</div>}
        </div>
      );
    }
    return (
      <div className="field">
        <label>{def.label}</label>
        <select className="select" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
          {(def.options ?? []).map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        {def.hint && <div className="hint">{def.hint}</div>}
      </div>
    );
  }

  if (def.type === 'number') {
    return (
      <div className="field">
        <label>{def.label}</label>
        <input
          className="input"
          type="number"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        {def.hint && <div className="hint">{def.hint}</div>}
      </div>
    );
  }

  return (
    <div className="field">
      <label>{def.label}{def.required && <span style={{ color: 'var(--red)' }}> *</span>}</label>
      <input
        className="input"
        value={value}
        disabled={disabled}
        placeholder={def.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {def.hint && <div className="hint">{def.hint}</div>}
    </div>
  );
}

/** 技能真实开拍：表单 → 启动 pipeline → SSE 订阅 → 产物展示 */
export default function SkillRunner({ slug }: { slug: string }) {
  const form = getSkillForm(slug)!;

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(form.fields.map((f) => [f.key, f.default !== undefined ? String(f.default) : ''])),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [task, setTask] = useState<PipelineTask | null>(null);
  const [artifacts, setArtifacts] = useState<Array<{ kind: string; name?: string; path: string }>>([]);
  const unsubRef = useRef<(() => void) | null>(null);

  const setValue = (key: string, v: string) => setValues((prev) => ({ ...prev, [key]: v }));

  const missingRequired = form.fields.filter((f) => f.required && !String(values[f.key] || '').trim());

  const handleSubmit = async () => {
    if (missingRequired.length || submitting) return;
    setError('');
    setSubmitting(true);
    setTask(null);
    setArtifacts([]);
    try {
      const models = await pickDefaultModels();
      if (!models) {
        setError('模型未配置：请先在设置页填入 API Key 并选择默认模型。');
        return;
      }
      const params = form.buildParams(values, models as unknown as Record<string, string>);
      const start: PipelineStartResponse =
        form.pipeline === 'standard' ? await startStandardPipeline(params)
        : form.pipeline === 'digital_human' ? await startDigitalHumanPipeline(params)
        : form.pipeline === 'image_animate' ? await startImageAnimatePipeline(params)
        : form.pipeline === 'meme_factory' ? await startMemeFactoryPipeline(params)
        : form.pipeline === 'video_understand' ? await startVideoUnderstandPipeline(params)
        : form.pipeline === 'song_mv' ? await startSongMvPipeline(params)
        : form.pipeline === 'audio_book' ? await startAudioBookPipeline(params)
        : await startActionTransferPipeline(params);

      unsubRef.current?.();
      unsubRef.current = subscribePipelineTask(
        start.task_id,
        (ev: PipelineTaskEvent) => {
          if (ev.type === 'snapshot') {
            setTask((prev) => ({ ...(prev ?? { task_id: start.task_id, pipeline: start.pipeline, status: ev.status ?? 'pending' }), status: ev.status ?? 'pending', progress: ev.progress } as PipelineTask));
          } else if (ev.type === 'progress') {
            setTask((prev) => ({ ...(prev ?? { task_id: start.task_id, pipeline: start.pipeline, status: 'running' }), status: 'running', progress: ev.progress, message: undefined } as PipelineTask));
          } else if (ev.type === 'artifact' && ev.artifact) {
            setArtifacts((prev) => [...prev, ev.artifact!]);
          } else if (ev.type === 'completed') {
            setTask((prev) => ({ ...(prev ?? { task_id: start.task_id, pipeline: start.pipeline }), status: 'completed', progress: 100 } as PipelineTask));
            unsubRef.current?.();
          } else if (ev.type === 'failed') {
            setTask((prev) => ({ ...(prev ?? { task_id: start.task_id, pipeline: start.pipeline }), status: 'failed' } as PipelineTask));
            setError('任务失败，请查看后端日志或稍后重试');
            unsubRef.current?.();
          }
        },
        () => setError('任务事件流中断，请刷新页面查看最新状态'),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '启动失败');
    } finally {
      setSubmitting(false);
    }
  };

  const pct = task?.progress ?? 0;
  const running = task?.status === 'running' || task?.status === 'pending';

  return (
    <div className="work">
      <div className="card form-card">
        {form.fields.map((f) => (
          <Field key={f.key} def={f} value={values[f.key] ?? ''} onChange={(v) => setValue(f.key, v)} disabled={submitting || running} />
        ))}

        <div className="cost">
          <Icon name="clock" className="ic ic-sm" />
          {form.costHint}
        </div>

        {error && (
          <div className="notice notice-error" style={{ marginBottom: 12 }}>
            <Icon name="alert" className="ic ic-sm" />
            <span>
              {error}
              <Link href="/settings" style={{ marginLeft: 8, textDecoration: 'underline' }}>去设置</Link>
            </span>
          </div>
        )}

        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%' }}
          type="button"
          onClick={handleSubmit}
          disabled={submitting || running || missingRequired.length > 0}
        >
          <Icon name="zap" className="ic ic-sm" />
          {submitting ? '启动中…' : running ? '生成中…' : form.submitLabel}
        </button>
        {missingRequired.length > 0 && (
          <div className="hint" style={{ textAlign: 'center' }}>还有必填项未完成</div>
        )}
      </div>

      <div className="card preview-card">
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>生成结果</h3>
        {task ? (
          <div>
            <div className="kv"><span className="k">任务状态</span><span className="v">{task.status}</span></div>
            <div className="progress live" style={{ margin: '10px 0 14px' }}><div style={{ width: `${pct}%` }} /></div>
            {artifacts.length > 0 && (
              <div className="artifacts">
                {artifacts.map((a, i) => (
                  <a key={i} className="artifact" href={toCodeUrl(a.path)} target="_blank" rel="noreferrer">
                    <Icon name={a.kind === 'video' ? 'play' : 'image'} style={{ color: 'var(--green)' }} />
                    {a.name || a.path.split('/').pop()}
                    <span className="st">查看</span>
                  </a>
                ))}
              </div>
            )}
            {artifacts.length === 0 && running && <div className="preview-empty"><Icon name="film" /><div style={{ fontSize: 13 }}>生成中，产物会实时出现在这里</div></div>}
          </div>
        ) : (
          <div className="preview-empty">
            <Icon name="film" />
            <div style={{ fontSize: 13 }}>还没有产物</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>填好左侧表单，点「{form.submitLabel}」<br />这里会实时出现进度与成片</div>
          </div>
        )}
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 10, lineHeight: 1.6 }}>
          这条技能跑在真实后端生产线上（{form.pipeline} 管线 · 任务队列 + 进度事件 + 产物登记），与「短片创作」共用同一套框架。
        </div>
      </div>
    </div>
  );
}
