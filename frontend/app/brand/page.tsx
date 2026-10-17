'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/Icon';

/** 品牌定稿页（P0 评审稿落地版）：色板 / Logo 候选 / 彩色四用 / 创新提案 / 迭代记录 / 页面入口 */
export default function BrandPage() {
  const [demoSwitch, setDemoSwitch] = useState(true);

  return (
    <div>
      <section className="hero">
        <span className="kicker">
          <Icon name="wand" className="ic ic-sm" />小云雀开源项目 → 属于你的产品 · 品牌定稿 v0.9++
        </span>
        <h1>该素的地方素，<em>该彩的地方彩</em></h1>
        <p className="sub">陛下七审定了侧边栏后八问：能不能来点不一样的。我的答案——市面 AIGC 工具都在卷生成质量，那是红海；小云雀独有的资产是<b>6 阶段结构化 Agent 流水线</b>，剧本/角色/场景/分镜全是结构化数据。这一版基于这个地基做两个创新演示：<b>① 灵感赌场</b>（入口创新：拉杆出创意，组合经 Agent 预校验保证能拍）和<b>② Remix 工作台</b>（流程创新：换主角/换场景/改分镜只重跑对应阶段，前面产物原样保留，还有镜头级重生）。都是别的「一条道生成到黑」的工具做不到的事。</p>
        <div className="card decision-bar">
          <Icon name="refresh" />
          <div className="t">
            <b>迭代记录</b><br />
            <b>v0.2</b>（下午）· 定名「雀跃 HueJoy」；主色定稿雀跃紫 #8B5CF6；技能库维持原方案<br />
            <b>v0.3</b>（傍晚）· 陛下二审：Logo 太丑、橙色仍跳脱 → 主色换蓝紫 #6E56CF + 极光渐变；Logo 改「折纸飞鸟」<br />
            <b>v0.4</b>（晚间）· 陛下三审：最爱极简社区派 → 全站黑白化，弃用一切彩色<br />
            <b>v0.5</b>（入夜）· 陛下四审：全黑「一潭死水」→ <b>黑白为底 + 彩色三用</b>：状态/技能/封面恢复彩色，框架保持素净<br />
            <b>v0.6</b>· 陛下五审：Logo 太静 → 换<b>「跃雀」</b>，雀紫点睛（雀眼/光尘），品牌符号解禁单点彩色<br />
            <b>v0.7</b>· 陛下六审：还是素 + 等待没互动 → <b>去素增活</b>（暖纸/光晕/微交互）+ <b>等待体验页</b>（ETA/叙事流/日志/小课堂/庆祝）<br />
            <b>v0.8</b>· 陛下七审：问有没有侧边栏 → 顶部横导航改<b>左侧边栏</b>：分组导航（创作/资产/实验室/关于）+ 用户卡 + 窄顶栏面包屑；可折叠（240→68px）、移动端抽屉<br />
            <b>v0.9</b>· 陛下八问：来点不一样的 → 基于 6 阶段结构化产物做两个创新演示：<b>灵感赌场</b>（拉杆出创意+Agent 预校验）与<b>Remix 工作台</b>（阶段级重跑+镜头级重生+成本沙盘）<br />
            <b>v0.9+</b>· 陛下追问：普通人不会搓资产怎么办 → 新增<b>资产车间</b>：资产三件套科普 + 三条起手式（模板魔改/一句话拆解/拉片抄作业）+ 四宫格候选 + 微调入库，把「搓资产」从提示词玄学变成选配工科<br />
            <b>v0.9++</b>（现在）· 陛下十审：多加点 skill → 技能库 10 → <b>18 条</b>：新增商品 360° 展示 / 表情包工厂 / 小说推文视频 / 婚礼纪念短片 / 游戏高光二创 / 品牌片头动效 / 食谱视频 / 知识卡片视频<br />
            <b>P1</b>（现在）· 陛下拍板「落地」→ 原型整体迁移为真实 Next.js 代码：设计系统 token 全量迁移、新信息架构 9 路由、双模驾驶/等待体验/赌场/资产车间/Remix 全部功能化
          </div>
        </div>
      </section>

      <div className="section-title"><h2>彩色四用 · 新规矩</h2><span className="more">Midjourney 的骨架，加回该有的血气</span></div>

      <div className="card spec-block">
        <div className="rule-row">
          <div className="ic-box" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><Icon name="check" /></div>
          <div><h4>① 状态信号</h4><p>绿=已完成、蓝=进行中（带脉冲光圈）、琥珀=等待/待确认、红=异常。全站状态色统一收口到这四支，别处不准用。</p></div>
        </div>
        <div className="rule-row">
          <div className="ic-box" style={{ background: 'var(--purple-soft)', color: 'var(--purple)' }}><Icon name="grid" /></div>
          <div><h4>② 技能身份</h4><p>每条技能一枚彩色图标砖（紫/粉/蓝/青/绿/琥珀各属其事），技能库一眼可辨、跨页面可追踪。全站仅技能砖与技能详情页允许彩色图标。</p></div>
        </div>
        <div className="rule-row">
          <div className="ic-box" style={{ background: 'var(--pink-soft)', color: 'var(--pink)' }}><Icon name="film" /></div>
          <div><h4>③ 作品封面</h4><p>项目封面、镜头缩略图用彩色渐变——那是用户作品的位置，本来就该五彩缤纷。界面越素，作品越亮。</p></div>
        </div>
        <div className="rule-row">
          <div className="ic-box" style={{ background: '#171717', color: '#fff' }}><Icon name="sparkles" /></div>
          <div><h4>④ 品牌点睛（v0.6 新增）</h4><p>雀紫 #8B5CF6 是品牌色，只准出现在：Logo 雀眼/光尘、顶栏「跃」字、导航激活光、输入聚焦环、区块标题渐变色条、自动挡开关。一支色，全站点到为止。</p></div>
        </div>
      </div>

      <div className="section-title"><h2>等待体验 · 生成中不空转</h2><span className="more">v0.7 新增 · AIGC 产品的核心时段设计</span></div>

      <div className="card spec-block">
        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.9, marginBottom: 16 }}>AI 生成一条片要 3-40 分钟，<b style={{ color: 'var(--text-1)' }}>等待是产品的主界面，不是空档</b>。雀跃的等待体验按四条原则设计（完整可交互演示见「等待中」页面）：</p>
        <div className="rule-row">
          <div className="ic-box" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="clock" /></div>
          <div><h4>① 等待可期 · ETA 倒计时</h4><p>「预计还需 07:42」实时倒数，总进度条带微光流动——等待有了刻度，人就不焦虑。ETA 随真实队列动态修正，不画饼。</p></div>
        </div>
        <div className="rule-row">
          <div className="ic-box" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="zap" /></div>
          <div><h4>② 过程透明 · 阶段叙事流</h4><p>6 阶段竖向叙事：已完成打绿勾、进行中蓝色脉冲 + 当前任务文案（「正在绘制第 3 场的分镜」）、排队中琥珀待命。底部实时日志滚动，导演组干了什么全看得见。</p></div>
        </div>
        <div className="rule-row">
          <div className="ic-box" style={{ background: 'var(--purple-soft)', color: 'var(--purple)' }}><Icon name="book" /></div>
          <div><h4>③ 预览先行 · 边等边审</h4><p>剧本、角色、场景先生成先可看——不等成片就能审内容，第 3 场台词不满意当场改。已出产物常驻右列，生成中也能反复看。</p></div>
        </div>
        <div className="rule-row">
          <div className="ic-box" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><Icon name="bell" /></div>
          <div><h4>④ 随时可走 · 完成叫你</h4><p>后台运行 + 「完成后通知我」开关，用户可以去忙别的；等待时还有导演小课堂轮播和灵感 chips 防止空转。成片那一刻：场记板合上、彩带落下、直接可播。</p></div>
        </div>
      </div>

      <div className="section-title"><h2>侧边栏骨架 · v0.8 新布局</h2><span className="more">顶栏 5 入口到上限 → 侧边栏分组导航，桌面可折叠 / 移动端抽屉</span></div>

      <div className="card spec-block">
        <div className="rule-row">
          <div className="ic-box" style={{ background: 'var(--purple-soft)', color: 'var(--purple)' }}><Icon name="grid" /></div>
          <div><h4>① 分组导航，治好选择困难</h4><p>侧栏分四组：<b>创作</b>（创作台 / 技能库）、<b>资产</b>（项目库 / 等待中）、<b>实验室</b>（灵感赌场 / 资产车间 / Remix 工作台）、<b>关于</b>（品牌定稿）。技能从 1 条主线扩到 18 条后，分组是必选项；「等待中」带蓝点——有任务在跑时呼吸闪烁，不点进去也知道进度。</p></div>
        </div>
        <div className="rule-row">
          <div className="ic-box" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="panel" /></div>
          <div><h4>② 顶栏收窄成面包屑</h4><p>Logo 和导航搬进侧栏后，顶部只剩：折叠按钮 + 当前位置（面包屑，如「技能库 / 电商产品片」）+ 右侧设置与头像。聚焦页（工作台 / 技能详情）也能随时看清自己在哪。</p></div>
        </div>
        <div className="rule-row">
          <div className="ic-box" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><Icon name="user" /></div>
          <div><h4>③ 用户卡落底 + 双形态适配</h4><p>侧栏底部固定用户卡（朕 · 免费版 · 今日剩 3 次）——额度常驻，创作前看得见。桌面 240px，点折叠钮收成 68px 图标条给内容让路；窄屏（≤960px）侧栏整体收进抽屉，顶栏出汉堡按钮。</p></div>
        </div>
      </div>

      <div className="section-title"><h2>创新提案 · v0.9 两个演示</h2><span className="more">地基：6 阶段结构化产物——这是 Agent 流水线独有的护城河</span></div>

      <div className="card spec-block">
        <div className="rule-row">
          <div className="ic-box" style={{ background: 'var(--purple-soft)', color: 'var(--purple)' }}><Icon name="shuffle" /></div>
          <div><h4>① 灵感赌场 · 入口创新</h4><p>解决「不知道拍什么」。三个滚轮（主角 × 世界 × 事件）拉一把杆，3 秒出一个跨界创意；所有组合经过 Agent 规则预校验——主体明确、冲突成立、场景可行，<b>不存在废创意</b>。单轮可微调、历史手气可回填、一键带预填 prompt 进创作台。把创作起点从「空白输入框」变成「老虎机」，门槛和乐趣同时解决。</p></div>
        </div>
        <div className="rule-row">
          <div className="ic-box" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="refresh" /></div>
          <div><h4>② Remix 工作台 · 流程创新</h4><p>别的工具改一个细节只能整片重生。雀跃的 6 阶段产物是结构化数据：<b>换主角</b>从角色设计起重跑、<b>换场景</b>从场景设计起重跑、<b>改分镜</b>走镜头级重生（只重生改动的那几镜，其余原片保留）。选中阶段之前的产物原样保留不重复计费，作品形成<b>谱系树</b>，每个分支标注省了多少时间和钱。附成本沙盘：重跑前看得见耗时与花费。</p></div>
        </div>
        <div className="rule-row">
          <div className="ic-box" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><Icon name="grid" /></div>
          <div><h4>为什么是这两个</h4><p>生成质量是红海（可灵/即梦/ Runway 的战场），打不赢也不该打。雀跃的护城河在结构：<b>阶段可拆、产物可留、重跑可控、成本可算</b>——赌场降低起点，Remix 拉长生命周期。一部作品不是一次性的，是能被反复改造的资产。</p></div>
        </div>
      </div>

      <div className="section-title"><h2>主流 AIGC 产品配色研究</h2><span className="more">陛下钦定路线：极简社区派（表中高亮行）</span></div>

      <div className="card spec-block">
        <table className="research">
          <thead><tr><th>产品</th><th>底色</th><th>品牌色</th><th>路线</th></tr></thead>
          <tbody>
            <tr className="picked"><td>Midjourney</td><td>黑白</td><td>无彩色</td><td>极简社区派 · 雀跃选定</td></tr>
            <tr><td>Runway</td><td>深黑</td><td>绿 → 蓝 电光渐变</td><td>深色影院派 · 让视频自己发光</td></tr>
            <tr><td>Adobe Firefly</td><td>中性亮</td><td>品红 → 紫 渐变</td><td>专业工具派</td></tr>
            <tr><td>Canva</td><td>亮</td><td>青 → 紫 渐变</td><td>明亮工具派</td></tr>
            <tr><td>可灵 / 即梦 / Vidu</td><td>深色</td><td>蓝 / 蓝紫</td><td>深色工具派</td></tr>
          </tbody>
        </table>
        <p className="concl">陛下结论：<b>极简社区派的骨架 + 克制的功能彩</b>。Midjourney 证明没有彩色也能有高级感，但它作品本身极其绚烂——UI 让位、作品发光。雀跃据此：框架（画布/卡片/按钮/导航/文字）全黑白灰，彩色只出现在状态、技能、封面三处。</p>
      </div>

      <div className="section-title"><h2>新 Logo 三选</h2><span className="more">v0.6 活跃版 · A「跃雀」已应用，想换 B / C 一句话即可</span></div>

      <div className="grid grid-3">
        <div className="card logo-opt applied">
          <span className="opt-badge">已应用</span>
          <div className="lg">
            <svg viewBox="0 0 48 48"><rect x="5" y="5" width="38" height="38" rx="11" fill="#171717" /><path d="M13 34 Q22 25 33 16.5 Q36.5 14 35.5 19 Q33.5 27.5 24.5 31.5 Q17.5 34.5 13 34 Z" fill="#FFF" /><path d="M26 23.5 Q29.5 14.5 38 10.5 Q34.5 19.5 30 26.5 Z" fill="#FFF" opacity=".8" /><path d="M14 32.5 L7 37 L15.5 35 Z" fill="#FFF" opacity=".72" /><circle cx="33.6" cy="18.4" r="1.5" fill="#8B5CF6" /><path d="M9 39.5 Q15.5 42 22 40.5" stroke="#FFF" strokeWidth="1.8" fill="none" opacity=".38" strokeLinecap="round" /><path d="M12.5 41.5 Q17 43 22.5 42" stroke="#FFF" strokeWidth="1.3" fill="none" opacity=".22" strokeLinecap="round" /><circle cx="29.5" cy="36.5" r="1.4" fill="#8B5CF6" opacity=".9" /><circle cx="25" cy="39.5" r="1" fill="#8B5CF6" opacity=".55" /></svg>
          </div>
          <h4>A · 跃雀</h4>
          <p className="mean">墨黑容器 + 一只正向上跃起的雀：扬起的翅、甩出的尾、两道白色跃动弧线，「跃」的动态直接画进图形。雀紫只点两笔——雀眼和两颗跃动光尘，34px 小尺寸依然活。</p>
        </div>

        <div className="card logo-opt">
          <div className="lg">
            <svg viewBox="0 0 48 48"><rect x="5" y="5" width="38" height="38" rx="11" fill="#171717" /><g transform="rotate(-16 24 24)"><path d="M36 13 L13 25 L24 29 Z" fill="#FFF" /><path d="M36 13 L24 29 L13 31 Z" fill="#FFF" opacity=".72" /></g><path d="M10 37 Q17 41 26 39" stroke="#FFF" strokeWidth="1.6" fill="none" opacity=".35" strokeLinecap="round" strokeDasharray="1.2 3" /><circle cx="30" cy="35.5" r="1.4" fill="#8B5CF6" opacity=".9" /><circle cx="25.5" cy="38.5" r="1" fill="#8B5CF6" opacity=".55" /></svg>
          </div>
          <h4>B · 纸飞机 · 跃轨版</h4>
          <p className="mean">保留折纸飞机，整体倾斜 16°，加一道虚线跃轨和雀紫光尘——静物变动态，改动最小的活跃方案。</p>
        </div>

        <div className="card logo-opt">
          <div className="lg">
            <svg viewBox="0 0 48 48"><rect x="5" y="8" width="38" height="27" rx="10" fill="none" stroke="#171717" strokeWidth="3.5" /><path d="M16 33 L16 41.5 L26.5 33" fill="none" stroke="#171717" strokeWidth="3.5" strokeLinejoin="round" /><path d="M20.5 15.5 L31.5 21.5 L20.5 27.5 Z" fill="#171717" /><path d="M36.5 12.5 l.9 2 2 .9 -2 .9 -.9 2 -.9 -2 -2 -.9 2 -.9 z" fill="#8B5CF6" /></svg>
          </div>
          <h4>C · 气泡片场 · 跃动版</h4>
          <p className="mean">墨色对话气泡 + 播放键，右上角加一枚雀紫四角星闪光。直说产品本质：说一句话，出片子。</p>
        </div>
      </div>

      <div className="section-title"><h2>品牌与备选</h2><span className="more">雀跃已选定，另两个降级备选</span></div>

      <div className="grid grid-3" style={{ marginTop: 8 }}>
        <div className="card name-card recommended">
          <span className="rec-badge">已选定</span>
          <div className="logo-wrap">
            <svg viewBox="0 0 48 48"><rect x="5" y="5" width="38" height="38" rx="11" fill="#171717" /><path d="M13 34 Q22 25 33 16.5 Q36.5 14 35.5 19 Q33.5 27.5 24.5 31.5 Q17.5 34.5 13 34 Z" fill="#FFF" /><path d="M26 23.5 Q29.5 14.5 38 10.5 Q34.5 19.5 30 26.5 Z" fill="#FFF" opacity=".8" /><path d="M14 32.5 L7 37 L15.5 35 Z" fill="#FFF" opacity=".72" /><circle cx="33.6" cy="18.4" r="1.5" fill="#8B5CF6" /><path d="M9 39.5 Q15.5 42 22 40.5" stroke="#FFF" strokeWidth="1.8" fill="none" opacity=".38" strokeLinecap="round" /><path d="M12.5 41.5 Q17 43 22.5 42" stroke="#FFF" strokeWidth="1.3" fill="none" opacity=".22" strokeLinecap="round" /><circle cx="29.5" cy="36.5" r="1.4" fill="#8B5CF6" opacity=".9" /><circle cx="25" cy="39.5" r="1" fill="#8B5CF6" opacity=".55" /></svg>
          </div>
          <h3>雀跃 <span className="en">HueJoy</span></h3>
          <div className="slogan">「灵感一跳，即成片」</div>
          <p className="story">雀，承自小云雀的血统，是对上游开源项目的致敬；跃，是灵感落地的那个瞬间。新标志「跃雀」：一只正向上跃起的雀——扬翅、甩尾、跃动弧线，把「一跃」画进图形；雀紫点睛（雀眼 + 光尘），是全站品牌符号里唯一的彩色。</p>
          <div className="vibe">
            <span className="tag tag-primary">极简年轻</span>
            <span className="tag tag-gray">血缘致敬</span>
            <span className="tag tag-gray">作品优先</span>
          </div>
        </div>

        <div className="card name-card backup">
          <div className="logo-wrap">
            <svg viewBox="0 0 48 48"><path d="M29 6 Q33 2 37 6 M37 6 Q41 2 45 6" stroke="#171717" strokeWidth="2.4" fill="none" strokeLinecap="round" /><rect x="5" y="16" width="38" height="25" rx="8" fill="#171717" /><path d="M8 16 L14 6 H42 L36 16 Z" fill="#6F6F6F" /><path d="M15 6 L12.5 10 M24 6 L21.5 10 M33 6 L30.5 10" stroke="#FFF" strokeWidth="2" strokeLinecap="round" /><path d="M21 22 L32 28.5 L21 35 Z" fill="#FFF" /></svg>
          </div>
          <h3>小片场 <span className="en">TakeOne</span></h3>
          <div className="slogan">「你的第一条片，从这里开拍」</div>
          <p className="story">每个人心里都有一个小片场。不用懂镜头、不用学剪辑——说一句话，场记板一响，片子就开拍。Take One，影视片场第一条的专业感，被翻译成了人人可用的轻快。</p>
          <div className="vibe">
            <span className="tag tag-gray">零解释成本</span>
            <span className="tag tag-gray">图标系统天然</span>
            <span className="tag tag-gray">可延展系列</span>
            <span className="tag tag-gray">备选</span>
          </div>
        </div>

        <div className="card name-card backup">
          <div className="logo-wrap">
            <svg viewBox="0 0 48 48"><rect x="5" y="5" width="38" height="38" rx="12" fill="none" stroke="#171717" strokeWidth="3" /><path d="M10 31 q14 -13 28 0" stroke="#171717" strokeWidth="2.6" fill="none" strokeLinecap="round" /><rect x="17" y="11" width="14" height="10" rx="2.5" fill="#171717" /><circle cx="20.5" cy="16" r="1.4" fill="#FFF" /><circle cx="27.5" cy="16" r="1.4" fill="#FFF" /></svg>
          </div>
          <h3>灵感坞 <span className="en">IdeaDock</span></h3>
          <div className="slogan">「灵感靠岸，大片出厂」</div>
          <p className="story">灵感像船，需要一座靠岸的坞。坞，既是停泊的地方，也是建造的工场——停泊的是念头，出厂的是成片。</p>
          <div className="vibe">
            <span className="tag tag-gray">温暖可靠</span>
            <span className="tag tag-gray">工厂叙事</span>
            <span className="tag tag-gray">轻快感弱</span>
            <span className="tag tag-gray">备选</span>
          </div>
        </div>
      </div>

      <div className="section-title"><h2>视觉规范 · 极简社区派精修版</h2><span className="more">黑白灰基色 × 克制的功能彩 × 大留白</span></div>

      <div className="grid" style={{ gap: 16 }}>
        <div className="card spec-block">
          <h3><Icon name="sparkles" />色板</h3>
          <div className="pal-group">基色 · 框架专用（画布/卡片/按钮/文字/导航，全站 90% 面积）· v0.7 画布暖纸化</div>
          <div className="swatches">
            <div className="swatch"><div className="c" style={{ background: '#171717' }} /><div className="t"><b>墨黑</b><span>#171717 · 唯一行动色</span></div></div>
            <div className="swatch"><div className="c" style={{ background: '#F7F5F2', borderBottom: '1px solid var(--border)' }} /><div className="t"><b>暖纸</b><span>#F7F5F2 · 画布底色（v0.7 起）</span></div></div>
            <div className="swatch"><div className="c" style={{ background: '#FFFFFF', borderBottom: '1px solid var(--border)' }} /><div className="t"><b>纯白</b><span>#FFFFFF · 卡片表面</span></div></div>
            <div className="swatch"><div className="c" style={{ background: '#6F6F6F' }} /><div className="t"><b>墨灰</b><span>#6F6F6F · 次级文字/图标</span></div></div>
            <div className="swatch"><div className="c" style={{ background: '#ADADAD' }} /><div className="t"><b>浅灰</b><span>#ADADAD · 辅助信息</span></div></div>
            <div className="swatch"><div className="c" style={{ background: '#EAEAEA' }} /><div className="t"><b>边框灰</b><span>#EAEAEA / #DBDBDB · 描边</span></div></div>
            <div className="swatch"><div className="c" style={{ background: '#F4F4F4', borderBottom: '1px solid var(--border)' }} /><div className="t"><b>填充灰</b><span>#F4F4F4 · 次要底色</span></div></div>
          </div>
          <div className="pal-group">功能彩 · 只准做状态信号（全站唯一允许彩色的 UI 元素）</div>
          <div className="swatches">
            <div className="swatch"><div className="c" style={{ background: '#34B37B' }} /><div className="t"><b>成片绿</b><span>#34B37B · 已完成</span></div></div>
            <div className="swatch"><div className="c" style={{ background: '#3AA7F5' }} /><div className="t"><b>晴空蓝</b><span>#3AA7F5 · 进行中</span></div></div>
            <div className="swatch"><div className="c" style={{ background: '#F0A02E' }} /><div className="t"><b>场记黄</b><span>#F0A02E · 等待/待确认</span></div></div>
            <div className="swatch"><div className="c" style={{ background: '#E5484D' }} /><div className="t"><b>警示红</b><span>#E5484D · 异常/失败</span></div></div>
          </div>
          <div className="pal-group">技能彩 · 只准做技能图标砖与技能详情页</div>
          <div className="swatches">
            <div className="swatch"><div className="c" style={{ background: '#8B5CF6' }} /><div className="t"><b>雀紫</b><span>#8B5CF6 · 短片主线/资讯</span></div></div>
            <div className="swatch"><div className="c" style={{ background: '#EC6B9E' }} /><div className="t"><b>樱粉</b><span>#EC6B9E · 歌曲 MV</span></div></div>
            <div className="swatch"><div className="c" style={{ background: '#1FA98C' }} /><div className="t"><b>黛青</b><span>#1FA98C · 数字人</span></div></div>
            <div className="swatch"><div className="c" style={{ background: '#3AA7F5' }} /><div className="t"><b>晴空蓝</b><span>#3AA7F5 · 绘本/动作迁移</span></div></div>
          </div>
        </div>

        <div className="grid grid-2">
          <div className="card spec-block">
            <h3><Icon name="film" />字体与层级</h3>
            <div className="type-row"><div className="demo demo-h1">今天想拍什么？</div><div className="info">页面主标题 · 30px / 600</div></div>
            <div className="type-row"><div className="demo demo-h2">选个技能开拍</div><div className="info">区块标题 · 20px / 600</div></div>
            <div className="type-row"><div className="demo demo-body">说一句话，剩下的交给导演组。</div><div className="info">正文 · 14px / 400</div></div>
            <div className="type-row"><div className="demo demo-cap">预计 3-5 分钟 · 消耗 12 积分</div><div className="info">辅助信息 · 12px / 400</div></div>
          </div>

          <div className="card spec-block">
            <h3><Icon name="check" />组件语言</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
              <button className="btn btn-primary" type="button">开始创作</button>
              <button className="btn btn-outline" type="button">高级设置</button>
              <button className="btn btn-ghost" type="button">取消</button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <span className="tag tag-primary">NEW</span><span className="tag tag-blue">进行中</span><span className="tag tag-green">已完成</span><span className="tag tag-amber">待确认</span><span className="tag tag-gray">稳定</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="switch-row">
                <div className={`switch${demoSwitch ? ' on' : ''}`} onClick={() => setDemoSwitch((v) => !v)} role="presentation" />
                <span className="label">自动挡</span><span className="sub">跑完再叫我</span>
              </div>
              <div className="progress" style={{ flex: 1 }}><div style={{ width: '64%' }} /></div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-title"><h2>状态语义 · 彩色信号</h2><span className="more">四支状态色，一眼可辨</span></div>

      <div className="card spec-block">
        <div className="sem-row">
          <div className="dots"><span className="dot-done"><Icon name="check" style={{ strokeWidth: 3 }} /></span><span className="tag tag-green">已完成</span></div>
          <div className="info">绿色实心 + 对勾 · 阶段完成、成片就绪</div>
        </div>
        <div className="sem-row">
          <div className="dots"><span className="dot-run"><Icon name="play" style={{ strokeWidth: 3, fill: 'currentColor', stroke: 'none' }} /></span><span className="tag tag-blue">进行中</span></div>
          <div className="info">蓝色 + 脉冲光圈 · 生成中的阶段/任务</div>
        </div>
        <div className="sem-row">
          <div className="dots"><span className="dot-wait" /><span className="tag tag-amber">等待中</span></div>
          <div className="info">琥珀空心 · 待确认、排队、未开始</div>
        </div>
        <div className="sem-row">
          <div className="dots"><span className="tag tag-red">失败重试</span><span className="tag tag-gray">已暂停</span></div>
          <div className="info">红=异常需处理，灰=主动暂停 · 异常态允许红色，仅此一处</div>
        </div>
      </div>

      <div className="section-title"><h2>页面原型</h2><span className="more">全部可点击，按真实信息架构搭建</span></div>

      <div className="grid grid-3">
        <Link className="card entry-card" href="/">
          <div className="ic-box" style={{ background: '#171717', color: '#fff' }}><Icon name="home" /></div>
          <div><h4>创作台（首页）</h4><p>意图入口 + 技能快捷选择 + 进行中项目</p></div>
          <Icon name="arrow-right" className="ic arr" />
        </Link>
        <Link className="card entry-card" href="/skills">
          <div className="ic-box" style={{ background: 'var(--purple-soft)', color: 'var(--purple)' }}><Icon name="grid" /></div>
          <div><h4>技能库</h4><p>18 条生产线：1 主线 + 17 技能，可插拔</p></div>
          <Icon name="arrow-right" className="ic arr" />
        </Link>
        <Link className="card entry-card" href="/studio">
          <div className="ic-box" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="film" /></div>
          <div><h4>主流程工作台</h4><p>6 阶段流水线 + 双模驾驶 + 单阶段重做</p></div>
          <Icon name="arrow-right" className="ic arr" />
        </Link>
        <Link className="card entry-card" href="/skills/ecommerce-product">
          <div className="ic-box" style={{ background: 'var(--pink-soft)', color: 'var(--pink)' }}><Icon name="megaphone" /></div>
          <div><h4>技能详情 · 电商产品片</h4><p>新技能标准页：上传 → 脚本 → 成片</p></div>
          <Icon name="arrow-right" className="ic arr" />
        </Link>
        <Link className="card entry-card" href="/waiting">
          <div className="ic-box" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="clock" /></div>
          <div><h4>等待体验 · 生成中</h4><p>ETA 倒计时 + 阶段叙事流 + 实时日志 + 小课堂 + 彩带庆祝，全可交互</p></div>
          <Icon name="arrow-right" className="ic arr" />
        </Link>
        <Link className="card entry-card" href="/lab/casino">
          <div className="ic-box" style={{ background: 'var(--purple-soft)', color: 'var(--purple)' }}><Icon name="shuffle" /></div>
          <div><h4>灵感赌场 · 创新演示</h4><p>拉杆出创意，组合经 Agent 预校验保证能拍，全可交互</p></div>
          <Icon name="arrow-right" className="ic arr" />
        </Link>
        <Link className="card entry-card" href="/lab/remix">
          <div className="ic-box" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="refresh" /></div>
          <div><h4>Remix 工作台 · 创新演示</h4><p>阶段级重跑 + 镜头级重生 + 作品谱系树 + 成本沙盘</p></div>
          <Icon name="arrow-right" className="ic arr" />
        </Link>
        <Link className="card entry-card" href="/lab/asset-forge">
          <div className="ic-box" style={{ background: 'var(--pink-soft)', color: 'var(--pink)' }}><Icon name="package" /></div>
          <div><h4>资产车间 · 新人第一课</h4><p>不会搓资产？模板魔改 / 一句话拆解 / 拉片抄作业，三条起手式全可交互</p></div>
          <Icon name="arrow-right" className="ic arr" />
        </Link>
        <Link className="card entry-card" href="/projects">
          <div className="ic-box" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><Icon name="folder" /></div>
          <div><h4>项目库</h4><p>跨项目任务、产物与素材沉淀复用</p></div>
          <Icon name="arrow-right" className="ic arr" />
        </Link>
        <div className="card entry-card" style={{ cursor: 'default' }}>
          <div className="ic-box" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}><Icon name="settings" /></div>
          <div><h4>设置页</h4><p>API Key / 模型默认值 / 外观 · P1 阶段输出</p></div>
        </div>
      </div>
    </div>
  );
}
