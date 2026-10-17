'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Icon } from '@/components/Icon';

type FieldMap = Record<string, string>;

interface TplItem {
  name: string;
  ds: string;
  icon: 'user' | 'map-pin';
  g: string;
  hot?: boolean;
  fields: FieldMap;
}

interface CopyItem {
  name: string;
  src: string;
  g: string;
  tags: Array<{ text: string; cls: string }>;
  fields: FieldMap;
}

interface RecipeEntry {
  keys: string[];
  fields: FieldMap;
}

const TPLS: TplItem[] = [
  {
    name: '橘猫店长',
    ds: '角色 · 治愈系短片万金油',
    icon: 'user',
    g: 'linear-gradient(135deg,#B9A8F0,#6E56CF)',
    hot: true,
    fields: {
      主体: '一只 8 斤的橘猫，直立行走',
      外貌: '圆脸、严肃眉、尾巴总是翘着',
      服装: '棕色围裙 + 关东煮小帽',
      性格: '慢热但可靠，嘴上嫌弃手上帮忙',
      风格: '暖调插画风，胶片颗粒',
      镜头感: '中近景为主，微微仰视',
    },
  },
  {
    name: '社恐程序员',
    ds: '角色 · 职场/恋爱题材',
    icon: 'user',
    g: 'linear-gradient(135deg,#9BD4FF,#3AA7F5)',
    fields: {
      主体: '25 岁男生，黑框眼镜',
      外貌: '乱发、黑眼圈、连帽卫衣',
      服装: '格子睡衣 + 拖鞋',
      性格: '内心戏极多，嘴上嗯嗯嗯',
      风格: '冷调都市感，轻微噪点',
      镜头感: '过肩视角，浅景深',
    },
  },
  {
    name: '复古咖啡店主',
    ds: '角色 · 生活流叙事',
    icon: 'user',
    g: 'linear-gradient(135deg,#A78BFA,#7C3AED)',
    fields: {
      主体: '30 岁女生，法式盘发',
      外貌: '笑眼、腕上纹一串小字',
      服装: '亚麻衬衫 + 皮质围裙',
      性格: '温柔但有主见，记得住每位熟客的口味',
      风格: '暖棕胶片风',
      镜头感: '逆光轮廓，中景',
    },
  },
  {
    name: '深夜便利店',
    ds: '场景 · 都市治愈高频',
    icon: 'map-pin',
    g: 'linear-gradient(135deg,#C7B8F5,#8B5CF6)',
    fields: {
      主体: '24h 街角便利店，两排货架 + 收银台',
      外貌: '暖白灯光，玻璃上有雨痕',
      服装: '—',
      性格: '安静、收留深夜不回家的人',
      风格: '赛璐璐动画风，高对比',
      镜头感: '全景交代 + 货架间穿行',
    },
  },
  {
    name: '山顶露营夜',
    ds: '场景 · 情感/告白收尾',
    icon: 'map-pin',
    g: 'linear-gradient(135deg,#A8E6CF,#1FA98C)',
    fields: {
      主体: '山顶草甸，一顶帐篷 + 一堆篝火',
      外貌: '银河横贯，远处城市微光',
      服装: '—',
      性格: '辽阔、安静、适合谈心',
      风格: '厚涂插画，星野清晰',
      镜头感: '大远景，缓慢横移',
    },
  },
  {
    name: '老式杂货铺',
    ds: '场景 · 怀旧/亲情题材',
    icon: 'map-pin',
    g: 'linear-gradient(135deg,#F5C4D1,#EC6B9E)',
    fields: {
      主体: '90 年代街边杂货铺，木柜台 + 铁皮糖果罐',
      外貌: '掉漆的红漆木门，门口趴着黄狗',
      服装: '—',
      性格: '热闹、人情味、时光慢',
      风格: '水彩 + 做旧纸张',
      镜头感: '低机位，纵深调度',
    },
  },
];

const COPIES: CopyItem[] = [
  {
    name: '飞行员柴犬',
    src: '提取自：《银翼与狗》· 角色设定集',
    g: 'linear-gradient(135deg,#C7B8F5,#8B5CF6)',
    tags: [
      { text: '复古', cls: 'tag-purple' },
      { text: '热血', cls: 'tag-gray' },
    ],
    fields: {
      主体: '戴飞行员护目镜的柴犬，坐在双翼机驾驶舱',
      外貌: '机灵表情，围巾被风吹起',
      服装: '棕色飞行夹克 + 护目镜',
      性格: '热血莽撞，越险越兴奋',
      风格: '美式复古动画风，暖黄高饱和',
      镜头感: '座舱内近景，风镜反光',
    },
  },
  {
    name: '森林石像',
    src: '提取自：《风之谷》同人场景',
    g: 'linear-gradient(135deg,#A8E6CF,#1FA98C)',
    tags: [
      { text: '自然', cls: 'tag-green' },
      { text: '奇幻', cls: 'tag-gray' },
    ],
    fields: {
      主体: '被苔藓覆盖的古代石像，半埋在森林里',
      外貌: '面容温和，肩上停着蓝鸟',
      服装: '—',
      性格: '沉睡千年的守护者',
      风格: '吉卜力式自然厚涂，光斑灵动',
      镜头感: '仰拍，丁达尔光束',
    },
  },
  {
    name: '霓虹拉面摊',
    src: '提取自：《深夜食堂》混剪',
    g: 'linear-gradient(135deg,#9BD4FF,#3AA7F5)',
    tags: [
      { text: '都市', cls: 'tag-blue' },
      { text: '烟火气', cls: 'tag-gray' },
    ],
    fields: {
      主体: '霓虹灯牌下的拉面摊，深夜营业',
      外貌: '蒸汽腾腾，红蓝撞色灯牌',
      服装: '—',
      性格: '江湖气，深夜食堂式温暖',
      风格: '新海诚式都市夜景，高光溢出',
      镜头感: '透过蒸汽虚焦转实',
    },
  },
  {
    name: '月球女孩',
    src: '提取自：某科幻短片剧照',
    g: 'linear-gradient(135deg,#F5C4D1,#EC6B9E)',
    tags: [
      { text: '科幻', cls: 'tag-pink' },
      { text: '孤独', cls: 'tag-gray' },
    ],
    fields: {
      主体: '穿宇航服的小女孩，坐在月球边缘看地球',
      外貌: '头盔映出蓝色地球',
      服装: '白色旧款宇航服，手绘编号',
      性格: '孤独但勇敢',
      风格: '科幻绘本风，大面积留白',
      镜头感: '剪影，地球作为唯一光源',
    },
  },
];

const RECIPES: RecipeEntry[] = [
  {
    keys: ['我想要一只戴围裙的橘猫店长', '橘猫', '戴围裙'],
    fields: {
      主体: '一只戴围裙的橘猫，直立行走',
      外貌: '圆脸、胖、围裙上绣着「店」字',
      服装: '棕色围裙',
      性格: '表面凶，实际会照顾人',
      风格: '暖调插画风',
      镜头感: '中近景，微微仰视',
    },
  },
  {
    keys: ['深夜无人的便利店', '便利店'],
    fields: {
      主体: '深夜营业的街角便利店',
      外貌: '暖白灯光、空货架、玻璃雨痕',
      服装: '—',
      性格: '安静，收留深夜的人',
      风格: '赛璐璐动画风',
      镜头感: '全景交代 + 货架穿行',
    },
  },
  {
    keys: ['会魔法的银发小女孩', '魔法', '银发'],
    fields: {
      主体: '10 岁银发小女孩，见习魔法师',
      外貌: '银色长发、尖顶帽压不住呆毛',
      服装: '深蓝星纹斗篷 + 旧魔杖',
      性格: '好奇、莽撞、善良',
      风格: '奇幻绘本风，星光粒子',
      镜头感: '低机位，魔杖光效前景',
    },
  },
  {
    keys: ['赛博朋克风格的重庆街头', '赛博朋克', '重庆'],
    fields: {
      主体: '赛博朋克化的重庆江边街区',
      外貌: '霓虹招牌层叠、轻轨穿楼、雨后湿地面',
      服装: '—',
      性格: '混乱又有烟火气',
      风格: '新海诚都市夜景 + 霓虹撞色',
      镜头感: '过江缆车视角，纵深长镜头',
    },
  },
];

const EG_CHIPS = [
  '一只戴围裙的橘猫店长',
  '深夜无人的便利店，灯很暖',
  '会魔法的银发小女孩',
  '赛博朋克风格的重庆街头',
];

const CANDS = [
  { lbl: '候选 A · 正面', g: 'linear-gradient(135deg,#B9A8F0,#6E56CF)' },
  { lbl: '候选 B · 侧身', g: 'linear-gradient(135deg,#C7B8F5,#8B5CF6)' },
  { lbl: '候选 C · 半身', g: 'linear-gradient(135deg,#9BD4FF,#3AA7F5)' },
  { lbl: '候选 D · 全身', g: 'linear-gradient(135deg,#A8E6CF,#1FA98C)' },
];

const TUNES: Array<{ text: string; icon?: 'refresh' }> = [
  { text: '换个角度', icon: 'refresh' },
  { text: '换件衣服' },
  { text: '表情凶一点' },
  { text: '背景干净些' },
  { text: '重抽一张', icon: 'refresh' },
];

export default function AssetForgePage() {
  const [activeTab, setActiveTab] = useState<'tpl' | 'one' | 'copy'>('tpl');
  const [tplSel, setTplSel] = useState(0);
  const [chipOn, setChipOn] = useState<Record<string, string>>({});
  const [oneText, setOneText] = useState('');
  const [oneLoading, setOneLoading] = useState(false);
  const [oneEntry, setOneEntry] = useState<FieldMap | null>(null);
  const [oneReveal, setOneReveal] = useState(0);
  const [copySel, setCopySel] = useState(0);
  const [selCand, setSelCand] = useState(0);

  const [toastMsg, setToastMsg] = useState('');
  const [toastShow, setToastShow] = useState(false);
  const toastTimer = useRef<number | null>(null);
  const timeoutRefs = useRef<number[]>([]);

  function showToast(msg: string) {
    setToastMsg(msg);
    setToastShow(true);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastShow(false), 2200);
  }

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((id) => window.clearTimeout(id));
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  function chipEl(field: string, text: string): ReactElement {
    const on = chipOn[field] === text || (chipOn[field] === undefined && text === '保持');
    return (
      <span
        key={field + text}
        className={`chip${on ? ' on' : ''}`}
        onClick={() => {
          setChipOn((prev) => ({ ...prev, [field]: text }));
          showToast('配方已微调：' + text);
        }}
      >
        {text}
      </span>
    );
  }

  function buildChips(k: string, v: string): ReactElement | null {
    if (k === '服装' && v !== '—') {
      return <div className="chips">{['换颜色', '换款式', '去掉'].map((c) => chipEl(k, c))}</div>;
    }
    if (k === '性格') {
      return <div className="chips">{['更活泼', '更高冷', '保持'].map((c) => chipEl(k, c))}</div>;
    }
    if (k === '风格') {
      return <div className="chips">{['更写实', '更卡通', '保持'].map((c) => chipEl(k, c))}</div>;
    }
    return null;
  }

  function renderTplRecipe(t: TplItem): ReactElement {
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              background: t.g,
            }}
          >
            <Icon name="sparkles" style={{ width: 18, height: 18 }} />
          </span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>模板魔改中 · 改字段 = 改配方</div>
          </div>
        </div>
        {Object.entries(t.fields).map(([k, v]) => (
          <div className="r-field r-fill" key={k}>
            <div className="fl">
              <span className="dot" />
              {k}
            </div>
            <div className="fv">{v}</div>
            {buildChips(k, v)}
          </div>
        ))}
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
          onClick={() => showToast('生成任务已提交 · 下方四张候选约 40 秒后刷新')}
        >
          <Icon name="sparkles" className="ic ic-sm" />
          按这个配方生成
        </button>
      </>
    );
  }

  function renderCopyRecipe(c: CopyItem): ReactElement {
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              background: c.g,
            }}
          >
            <Icon name="search" style={{ width: 18, height: 18 }} />
          </span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>配方提取完成 · 抄来即可改</div>
          </div>
        </div>
        {Object.entries(c.fields).map(([k, v]) => (
          <div className="r-field r-fill" key={k}>
            <div className="fl">
              <span className="dot" />
              {k}
            </div>
            <div className="fv">{v}</div>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
          onClick={() => showToast('生成任务已提交 · 下方四张候选约 40 秒后刷新')}
        >
          <Icon name="sparkles" className="ic ic-sm" />
          抄过来，生成
        </button>
      </>
    );
  }

  function onParse() {
    const v = oneText.trim();
    if (!v) {
      showToast('先写一句你想要什么');
      return;
    }
    let hit: RecipeEntry | null = null;
    for (const r of RECIPES) {
      if (v.indexOf(r.keys[0]) > -1) {
        hit = r;
        break;
      }
    }
    if (!hit) {
      outer: for (const r of RECIPES) {
        for (let k = 1; k < r.keys.length; k++) {
          if (v.indexOf(r.keys[k]) > -1) {
            hit = r;
            break outer;
          }
        }
      }
    }
    if (!hit) hit = RECIPES[0];
    const chosen = hit;
    setOneLoading(true);
    setOneEntry(null);
    setOneReveal(0);
    const to = window.setTimeout(() => {
      setOneLoading(false);
      setOneEntry(chosen.fields);
      const keys = Object.keys(chosen.fields);
      keys.forEach((_, ki) => {
        const st = window.setTimeout(() => setOneReveal(ki + 1), 600 + ki * 320);
        timeoutRefs.current.push(st);
      });
    }, 600);
    timeoutRefs.current.push(to);
  }

  return (
    <div style={{ maxWidth: 1140, margin: '0 auto' }}>
      <div className="forge-hero">
        <h1>
          不会搓资产？<span style={{ color: 'var(--purple)' }}>让 Agent 替你搓</span>
        </h1>
        <p className="sub">
          不用学写提示词。雀跃把「搓一个角色/场景」拆成三步：<b>挑个模板改 → 说句大白话 → 出四张候选挑一张</b>。资产是所有短片的积木，这儿就是积木车间。
        </p>
      </div>

      <div className="abc">
        <div className="card">
          <div className="ic-box" style={{ background: 'var(--purple-soft)', color: 'var(--purple)' }}>
            <Icon name="user" />
          </div>
          <h4>
            角色 <span className="en">CHARACTER</span>
          </h4>
          <p>片子里出场的人或动物。定了长什么样，以后每个镜头里他都长一个样——不会第 1 镜是圆脸第 5 镜变尖脸。</p>
          <div className="eg">
            例：<b>橘猫店长</b> · 围裙 · 胖 · 严肃脸
          </div>
        </div>
        <div className="card">
          <div className="ic-box" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}>
            <Icon name="map-pin" />
          </div>
          <h4>
            场景 <span className="en">SCENE</span>
          </h4>
          <p>故事发生的地方。定了环境，镜头之间不会穿帮——第 2 镜货架在左，第 6 镜不会跑到右边去。</p>
          <div className="eg">
            例：<b>深夜便利店</b> · 暖光灯 · 雨夜窗外
          </div>
        </div>
        <div className="card">
          <div className="ic-box" style={{ background: 'var(--pink-soft)', color: 'var(--pink)' }}>
            <Icon name="package" />
          </div>
          <h4>
            道具 &amp; 参考 <span className="en">PROPS</span>
          </h4>
          <p>角色手里的东西、想复刻的画风照片。给 Agent 一个「照这个感觉来」的锚点，风格才稳。</p>
          <div className="eg">
            例：<b>关东煮锅</b> · 老式收银机 · 吉卜力画风参考
          </div>
        </div>
      </div>

      <div className="forge-main">
        <div className="mtabs">
          <button
            type="button"
            className={`mtab${activeTab === 'tpl' ? ' active' : ''}`}
            onClick={() => setActiveTab('tpl')}
          >
            <Icon name="package" className="ic ic-sm" />
            模板魔改<span className="rec">推荐</span>
          </button>
          <button
            type="button"
            className={`mtab${activeTab === 'one' ? ' active' : ''}`}
            onClick={() => setActiveTab('one')}
          >
            <Icon name="wand" className="ic ic-sm" />
            一句话搓
          </button>
          <button
            type="button"
            className={`mtab${activeTab === 'copy' ? ' active' : ''}`}
            onClick={() => setActiveTab('copy')}
          >
            <Icon name="search" className="ic ic-sm" />
            拉片抄作业
          </button>
        </div>

        <div className={`pane${activeTab === 'tpl' ? ' show' : ''}`} id="pane-tpl">
          <div className="forge-grid">
            <div className="card">
              <div className="panel-head">
                <h3>模板库</h3>
                <span className="more">角色 12 · 场景 10 · 道具 8，每周更新</span>
              </div>
              <div className="tpl-list">
                {TPLS.map((t, i) => (
                  <div key={t.name} className={`tpl${tplSel === i ? ' sel' : ''}`} onClick={() => setTplSel(i)}>
                    <div className="thumb" style={{ background: t.g }}>
                      <Icon name={t.icon} />
                      {t.hot && <span className="hot">热门</span>}
                    </div>
                    <div className="tinfo">
                      <div className="nm">{t.name}</div>
                      <div className="ds">{t.ds}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="panel-head">
                <h3>配方面板</h3>
                <span className="more">点左侧模板，改下面字段</span>
              </div>
              <div className="recipe">{renderTplRecipe(TPLS[tplSel])}</div>
            </div>
          </div>
        </div>

        <div className={`pane${activeTab === 'one' ? ' show' : ''}`} id="pane-one">
          <div className="card">
            <div className="one-shot">
              <div className="panel-head" style={{ padding: '0 0 14px' }}>
                <h3>用大白话说你想要什么</h3>
                <span className="more">Agent 自动拆成结构化配方</span>
              </div>
              <textarea
                id="oneInput"
                value={oneText}
                onChange={(e) => setOneText(e.target.value)}
                placeholder="例：我想要一只戴围裙的橘猫店长，胖胖的，表面上很凶其实会偷偷给流浪猫留关东煮"
              />
              <div className="eg-chips">
                {EG_CHIPS.map((c) => (
                  <span
                    key={c}
                    className="chip"
                    onClick={() => {
                      setOneText(c);
                    }}
                  >
                    {c}
                  </span>
                ))}
              </div>
              <div className="acts">
                <button type="button" className="btn btn-primary" onClick={onParse}>
                  <Icon name="sparkles" className="ic ic-sm" />
                  Agent 拆解
                </button>
                <span className="hint">不用写提示词，说人话就行。拆解结果可逐项改。</span>
              </div>
            </div>
            <div
              className="recipe"
              style={{
                borderTop: '1px dashed var(--border)',
                display: oneEntry || oneLoading ? 'block' : 'none',
              }}
            >
              {oneLoading && (
                <div className="r-empty">
                  <Icon name="refresh" style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> Agent 正在拆解…
                </div>
              )}
              {!oneLoading && oneEntry && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <span
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        background: 'linear-gradient(135deg,#B9A8F0,#6E56CF)',
                      }}
                    >
                      <Icon name="wand" style={{ width: 18, height: 18 }} />
                    </span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>拆解完成 · 6 个字段</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>来自你的原话：「{oneText}」</div>
                    </div>
                  </div>
                  {Object.entries(oneEntry)
                    .slice(0, oneReveal)
                    .map(([k, v]) => (
                      <div className="r-field r-fill" key={k}>
                        <div className="fl">
                          <span className="dot" />
                          {k}
                        </div>
                        <div className="fv">{v}</div>
                      </div>
                    ))}
                  {oneReveal >= Object.keys(oneEntry).length && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
                      onClick={() => showToast('已按配方生成，看下方四张候选')}
                    >
                      <Icon name="sparkles" className="ic ic-sm" />
                      按这个配方生成
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className={`pane${activeTab === 'copy' ? ' show' : ''}`} id="pane-copy">
          <div className="forge-grid">
            <div className="card">
              <div className="panel-head">
                <h3>从作品里抄配方</h3>
                <span className="more">案例库持续补充，也支持贴图提取</span>
              </div>
              <div className="copy-list">
                {COPIES.map((c, i) => (
                  <div
                    key={c.name}
                    className={`copy-item${copySel === i ? ' sel' : ''}`}
                    onClick={() => setCopySel(i)}
                  >
                    <div className="cv" style={{ background: c.g }}>
                      <Icon name="film" />
                    </div>
                    <div className="ci">
                      <div className="nm">{c.name}</div>
                      <div className="src">{c.src}</div>
                      <div className="tags">
                        {c.tags.map((t) => (
                          <span key={t.text} className={`tag ${t.cls}`}>
                            {t.text}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="panel-head">
                <h3>配方预览</h3>
                <span className="more">抄过来就是你的，可改</span>
              </div>
              <div className="recipe">{renderCopyRecipe(COPIES[copySel])}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="cand-wrap card">
        <div className="panel-head">
          <h3>四张候选 · 挑一张</h3>
          <span className="more">生成约 40 秒 · ¥0.20/张</span>
        </div>
        <div className="cands">
          {CANDS.map((c, i) => (
            <div
              key={c.lbl}
              className={`cand${selCand === i ? ' sel' : ''}`}
              style={{ background: c.g }}
              onClick={() => setSelCand(i)}
            >
              <span className="pick">
                <Icon name="check" className="ic ic-sm" />
              </span>
              <span className="lbl">{c.lbl}</span>
              <button
                type="button"
                className="tune"
                title="微调这张"
                onClick={(e) => {
                  e.stopPropagation();
                  showToast('微调指令已发送，重新生成这张…');
                }}
              >
                <Icon name="wand" className="ic ic-sm" />
              </button>
            </div>
          ))}
        </div>
        <div className="tune-bar">
          <span className="tt">对选中的那张不满意？微调：</span>
          {TUNES.map((t) => (
            <button
              key={t.text}
              type="button"
              className="tchip"
              onClick={() => showToast('已微调选中候选：' + t.text)}
            >
              {t.icon && <Icon name={t.icon} className="ic ic-sm" />}
              {t.text}
            </button>
          ))}
        </div>
      </div>

      <div className="store-strip">
        <div className="ic-box" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>
          <Icon name="package" />
        </div>
        <div className="st">
          <b>定稿即入库</b>
          <span>存入资产库后，所有项目、所有技能都能调用——搓一次，用一辈子</span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => showToast('已存入资产库 · 你的 6 个项目都能调用')}
        >
          <Icon name="check" className="ic ic-sm" />
          存入资产库
        </button>
      </div>

      <div className={`toast${toastShow ? ' show' : ''}`}>{toastMsg}</div>
    </div>
  );
}
