'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/Icon';

interface PoolEntry {
  name: string;
  words: string[];
}

const POOL: Record<number, PoolEntry> = {
  0: { name: '主角', words: ['橘猫', '独居女孩', '老木匠', '外卖骑手', '宇航员', '茶馆老板', '高中生', '流浪画家', '退休警察', '咖啡师'] },
  1: { name: '世界', words: ['成都老街', '赛博重庆', '末日地堡', '江南梅雨', '近地空间站', '90年代香港', '深山民宿', '海底城', '西北戈壁', '岭南骑楼'] },
  2: { name: '事件', words: ['开一家便利店', '找回一段记忆', '度过最后一天', '进行一场告白', '养了一盆奇异的植物', '收到一封未来的信', '筹备一场葬礼', '拆开一封道歉信', '追一只走丢的羊', '修好一台旧电视'] },
};

const INITIAL_HISTORY: string[][] = [
  ['宇航员', '近地空间站', '追一只走丢的羊'],
  ['退休警察', '90年代香港', '拆开一封道歉信'],
  ['老木匠', '江南梅雨', '修好一台旧电视'],
];

const DURATIONS = [1200, 1650, 2100];

export default function CasinoPage() {
  const [idx, setIdx] = useState<number[]>([0, 1, 0]);
  const [spinning, setSpinning] = useState(false);
  const [reelSpinning, setReelSpinning] = useState<boolean[]>([false, false, false]);
  const [resultVisible, setResultVisible] = useState(false);
  const [history, setHistory] = useState<string[][]>(INITIAL_HISTORY);
  const [winTick, setWinTick] = useState(0);
  const [saved, setSaved] = useState(false);

  const idxRef = useRef<number[]>([0, 1, 0]);
  const spinningRef = useRef(false);
  const doneRef = useRef(0);
  const intervalsRef = useRef<number[]>([]);
  const timeoutsRef = useRef<number[]>([]);
  const mountedRef = useRef(true);

  const wordAt = (r: number): string => POOL[r].words[idxRef.current[r]];
  const combo = (): string[] => [wordAt(0), wordAt(1), wordAt(2)];

  function showResult() {
    setResultVisible(true);
    setReelSpinning([false, false, false]);
    setWinTick((t) => t + 1);
    const c = combo();
    setHistory((prev) => [c, ...prev].slice(0, 5));
  }

  function spinAll() {
    if (spinningRef.current) return;
    spinningRef.current = true;
    setSpinning(true);
    setSaved(false);
    setResultVisible(false);
    setReelSpinning([true, true, true]);
    intervalsRef.current = [];
    timeoutsRef.current = [];
    doneRef.current = 0;
    for (let i = 0; i < 3; i++) {
      const iv = window.setInterval(() => {
        idxRef.current[i] = (idxRef.current[i] + 1) % POOL[i].words.length;
        setIdx([...idxRef.current]);
      }, 65);
      intervalsRef.current.push(iv);
      const to = window.setTimeout(() => {
        window.clearInterval(iv);
        if (mountedRef.current) {
          setReelSpinning((prev) => prev.map((s, k) => (k === i ? false : s)));
        }
        doneRef.current += 1;
        if (doneRef.current >= 3) showResult();
      }, DURATIONS[i]);
      timeoutsRef.current.push(to);
    }
    const end = window.setTimeout(() => {
      spinningRef.current = false;
      if (mountedRef.current) setSpinning(false);
    }, 2200);
    timeoutsRef.current.push(end);
  }

  function onRoll(r: number, d: number) {
    if (spinningRef.current) return;
    idxRef.current[r] = (idxRef.current[r] + d + POOL[r].words.length) % POOL[r].words.length;
    setIdx([...idxRef.current]);
    showResult();
  }

  function onHistory(c: string[]) {
    if (spinningRef.current) return;
    for (let i = 0; i < 3; i++) {
      const p = POOL[i].words.indexOf(c[i]);
      idxRef.current[i] = p < 0 ? 0 : p;
    }
    setIdx([...idxRef.current]);
    showResult();
  }

  useEffect(() => {
    mountedRef.current = true;
    const t = window.setTimeout(spinAll, 600);
    return () => {
      mountedRef.current = false;
      window.clearTimeout(t);
      intervalsRef.current.forEach((id) => window.clearInterval(id));
      timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const char = POOL[0].words[idx[0]];
  const world = POOL[1].words[idx[1]];
  const event = POOL[2].words[idx[2]];

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div className="casino-hero">
        <span className="luck">
          <Icon name="sparkles" className="ic ic-sm" />
          今日手气 · 已拉 3 把 · 出片率 100%
        </span>
        <h1>
          不知道拍什么？<span style={{ color: 'var(--purple)' }}>让命运选</span>
        </h1>
        <p className="sub">
          三个滚轮，拉一把杆，出一个创意。所有组合经过雀跃 Agent 预校验——<b>主体明确、冲突成立、场景可行</b>，保证能拍，不存在废创意。
        </p>
      </div>

      <div className="slot-machine">
        <div className="reels">
          {[0, 1, 2].map((i) => (
            <div
              key={`reel-${i}-${winTick}`}
              className={`reel${reelSpinning[i] ? ' spinning' : ''}${winTick > 0 ? ' win' : ''}`}
              id={`reel-${i}`}
            >
              <div className="cap">
                <span className="name">{POOL[i].name}</span>
                <span className="roll-btns">
                  <button type="button" title="上一个" onClick={() => onRoll(i, -1)}>
                    <Icon name="arrow-up" className="ic ic-sm" />
                  </button>
                  <button type="button" title="下一个" onClick={() => onRoll(i, 1)}>
                    <Icon name="arrow-down" className="ic ic-sm" />
                  </button>
                </span>
              </div>
              <div className="window">
                <span className="word">{POOL[i].words[idx[i]]}</span>
              </div>
            </div>
          ))}
          <div className="payline" />
        </div>

        <div className="lever-row">
          <button type="button" className="lever" id="lever" onClick={spinAll} disabled={spinning}>
            <Icon name="shuffle" />
            <span className="t">拉杆</span>
          </button>
          <div className="lever-hint">
            拉一把 ≈ 3 秒出创意
            <br />
            点滚轮上下箭头可手动微调
            <br />
            组合全部可拍，随便摇
          </div>
        </div>
      </div>

      <div
        className="card result-card"
        style={{ display: resultVisible ? undefined : 'none' }}
        key={winTick}
      >
        <div className="result-inner" style={{ animation: 'rise-in .4s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span className="tag tag-purple">
              <Icon name="sparkles" className="ic ic-sm" />
              命运选中
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              预估成片 30-45 秒 · 预计成本 ¥1.20 · 约 6 分钟
            </span>
          </div>
          <div className="idea">
            一个<em>{world}</em>里的<em>{char}</em>，<em>{event}</em>的故事。
          </div>
          <div className="why">
            <span className="tag tag-green">
              <Icon name="sparkles" className="ic ic-sm" />
              主体明确 · {char}
            </span>
            <span className="tag tag-green">
              <Icon name="sparkles" className="ic ic-sm" />
              场景可行 · {world}
            </span>
            <span className="tag tag-green">
              <Icon name="sparkles" className="ic ic-sm" />
              冲突成立 · {event}
            </span>
          </div>
          <div className="acts">
            <Link className="btn btn-primary" href="/">
              <Icon name="film" className="ic ic-sm" />
              用这个创意开拍
            </Link>
            <button type="button" className="btn btn-outline" onClick={spinAll}>
              <Icon name="shuffle" className="ic ic-sm" />
              换一批
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setSaved(true)} disabled={saved}>
              <Icon name="bookmark" className="ic ic-sm" />
              {saved ? '已收藏' : '收藏灵感'}
            </button>
          </div>
        </div>
      </div>
      <div className="luck-empty" style={{ display: resultVisible ? 'none' : 'block' }}>
        拉一把杆，或点上方箭头微调——创意会在这一行出现
      </div>

      <div className="history">
        <div className="section-title" style={{ marginTop: 8 }}>
          <h2>最近手气</h2>
          <span className="more">点任意一条回填滚轮</span>
        </div>
        <div className="chips">
          {history.map((c, i) => (
            <button type="button" key={i} className="chip" onClick={() => onHistory(c)}>
              {c[0]} × {c[1]} · {c[2]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
