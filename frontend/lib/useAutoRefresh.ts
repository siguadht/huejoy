'use client';

import { useEffect, useRef } from 'react';

interface AutoRefreshOptions {
  /** 轮询间隔（毫秒） */
  intervalMs: number;
  /** 是否启用；false 时完全不轮询，切回 true 会立即执行一次 */
  enabled?: boolean;
  /** 挂载 / enabled 变为 true 时是否立即执行一次；默认 true。页面自行负责首次加载时传 false */
  immediate?: boolean;
}

/**
 * 共享自动刷新 hook：
 * - 挂载 / enabled 变为 true 时立即执行一次（可用 immediate: false 关闭）
 * - 按 intervalMs 定时静默刷新（刷新逻辑由调用方控制，不强制 loading 态）
 * - 页面不可见时暂停轮询，恢复可见立即执行一次
 */
export function useAutoRefresh(callback: () => void | Promise<void>, options: AutoRefreshOptions): void {
  const { intervalMs, enabled = true, immediate = true } = options;
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const run = () => {
      if (!cancelled) void cbRef.current();
    };
    if (immediate) run();
    const id = setInterval(run, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs, enabled, immediate]);
}
