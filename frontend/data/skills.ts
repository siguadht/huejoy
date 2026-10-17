import type { IconName } from '@/components/Icon';

/** 技能徽标 */
export interface SkillBadge {
  text: string;
  cls: string;
}

/**
 * 后端能力映射（P2 真实化）
 * - workflow：6 阶段完整工作流（/api/project/*，即「短片创作」）
 * - pipeline：一键短流程（/api/pipelines/{id}/tasks）
 *   - standard：文艺短视频 / 食谱视频 / 知识卡片 / 小说推文 / 婚礼纪念 / 热点资讯 / 歌曲MV（文本驱动）
 *   - action_transfer：动作迁移（角色图+动作视频）
 *   - digital_human：数字人口播 / 电商产品片 / 数字人多语言（人物图+卖点）
 *   - image_animate：商品 360° 展示 / 品牌片头动效（单图+运镜）
 *   - meme_factory：表情包工厂（角色图→九宫格）
 *   - video_understand：影视解说二创 / 游戏高光二创（抽帧+VLM 理解）
 * - none：规划中，前端诚实降级展示
 */
export type SkillBackend =
  | { kind: 'workflow'; status: 'available' }
  | {
      kind: 'pipeline';
      id: 'standard' | 'action_transfer' | 'digital_human' | 'image_animate' | 'meme_factory' | 'video_understand' | 'song_mv' | 'audio_book';
      status: 'available' | 'beta';
    }
  | { kind: 'none'; status: 'planned' };

export interface Skill {
  slug: string;
  name: string;
  desc: string;
  /** 流程步骤，渲染时首尾加粗（创意 → … → 成片） */
  flow: string[];
  meta: string;
  icon: IconName;
  /** 技能彩砖（彩色四用之二：技能身份） */
  tile: { bg: string; color: string };
  badge?: SkillBadge;
  category: 'main' | 'short';
  /** 场景分组（用户视角，替代内部架构分类） */
  scene: 'blockbuster' | 'commerce' | 'daily' | 'memory' | 'play';
  href: string;
  /** 后端能力映射 */
  backend: SkillBackend;
}

/** 18 条技能（与 P0 原型 skills.html v0.9++ 一致；P1 阶段为演示数据，P2 接真实 pipeline） */
export const SKILLS: Skill[] = [
  {
    slug: 'short-film',
    name: '短片创作',
    desc: '从一句创意到完整成片，6 阶段全流程，每阶段产物可确认、可单独重做。',
    flow: ['创意', '剧本', '角色', '分镜', '参考图', '视频', '成片'],
    meta: '约 20-40 分钟 · 支持自动挡',
    icon: 'film',
    tile: { bg: 'var(--primary-soft)', color: 'var(--primary)' },
    badge: { text: '主力', cls: 'tag-primary' },
    category: 'main',
  scene: 'blockbuster',
    href: '/studio',
    backend: { kind: 'workflow', status: 'available' },
  },
  {
    slug: 'ecommerce-product',
    name: '电商产品片',
    desc: '上传商品图、写几句卖点，出口播 + 产品展示短片，带货场景直用。',
    flow: ['商品图', '卖点文案', '脚本', '成片'],
    meta: '约 3-5 分钟 · 3 步完成',
    icon: 'megaphone',
    tile: { bg: 'var(--purple-soft)', color: 'var(--purple)' },
    category: 'short',
  scene: 'commerce',
    href: '/skills/ecommerce-product',
    backend: { kind: 'pipeline', id: 'digital_human', status: 'beta' },
  },
  {
    slug: 'song-mv',
    name: '歌曲 MV',
    desc: '上传歌曲和歌词，自动分析节奏卡点，生成分镜 MV 并替换为主音轨。',
    flow: ['歌曲+歌词', '节奏分析', '分镜', 'MV'],
    meta: '约 5-10 分钟',
    icon: 'music',
    tile: { bg: 'var(--pink-soft)', color: '#C24A7C' },
    category: 'short',
  scene: 'memory',
    href: '/skills/song-mv',
    backend: { kind: 'pipeline', id: 'song_mv', status: 'beta' },
  },
  {
    slug: 'audio-picture-book',
    name: '有声绘本',
    desc: '一段故事文本，生成绘本风格插图 + 温柔旁白，适合亲子与睡前内容。',
    flow: ['故事文本', '分镜插图', '旁白', '成片'],
    meta: '约 5-8 分钟',
    icon: 'book',
    tile: { bg: 'var(--blue-soft)', color: 'var(--blue)' },
    category: 'short',
  scene: 'memory',
    href: '/skills/audio-picture-book',
    backend: { kind: 'pipeline', id: 'audio_book', status: 'beta' },
  },
  {
    slug: 'digital-human',
    name: '数字人口播',
    desc: '一张人物照片 + 口播文案，生成自然的数字人播报视频。',
    flow: ['人物图+文案', '合成', '口播视频'],
    meta: '约 3-5 分钟',
    icon: 'user',
    tile: { bg: 'var(--teal-soft)', color: 'var(--teal)' },
    category: 'short',
  scene: 'commerce',
    href: '/skills/digital-human',
    backend: { kind: 'pipeline', id: 'digital_human', status: 'available' },
  },
  {
    slug: 'digital-human-i18n',
    name: '数字人多语言',
    desc: '一条口播文案，输出中英日韩多语言版本，音色保持一致，出海带货利器。',
    flow: ['口播文案', '翻译', '多语言合成', '多组成片'],
    meta: '约 5-10 分钟',
    icon: 'globe',
    tile: { bg: 'var(--amber-soft)', color: '#B97A12' },
    category: 'short',
  scene: 'commerce',
    href: '/skills/digital-human-i18n',
    backend: { kind: 'pipeline', id: 'digital_human', status: 'beta' },
  },
  {
    slug: 'art-short-video',
    name: '文艺短视频',
    desc: '一段文案或灵感，配图加旁白，合成治愈系旁白配图短片。',
    flow: ['文案/灵感', '配图', '旁白', '成片'],
    meta: '约 3-5 分钟',
    icon: 'image',
    tile: { bg: 'var(--green-soft)', color: 'var(--green)' },
    category: 'short',
  scene: 'daily',
    href: '/skills/art-short-video',
    backend: { kind: 'pipeline', id: 'standard', status: 'available' },
  },
  {
    slug: 'motion-transfer',
    name: '动作迁移',
    desc: '把参考视频里的动作，迁移到你的角色图片上，一键复刻名场面。',
    flow: ['角色图+动作视频', '迁移', '成片'],
    meta: '约 2-4 分钟',
    icon: 'repeat',
    tile: { bg: 'var(--blue-soft)', color: 'var(--blue)' },
    category: 'short',
  scene: 'play',
    href: '/skills/motion-transfer',
    backend: { kind: 'pipeline', id: 'action_transfer', status: 'available' },
  },
  {
    slug: 'news-broadcast',
    name: '热点资讯播报',
    desc: '给一个关键词，自动生成资讯口播短片，日更账号的体力活它包了。',
    flow: ['关键词', '成稿', '脚本', '成片'],
    meta: '约 5-8 分钟',
    icon: 'zap',
    tile: { bg: 'var(--red-soft)', color: 'var(--red)' },
    category: 'short',
  scene: 'daily',
    href: '/skills/news-broadcast',
    backend: { kind: 'pipeline', id: 'standard', status: 'beta' },
  },
  {
    slug: 'film-commentary',
    name: '影视解说二创',
    desc: '长视频丢进来，自动理解剧情、写解说文案、重绘分镜，产出二创解说片。',
    flow: ['长视频', '理解', '解说+分镜', '成片'],
    meta: '约 15-25 分钟 · 需视频理解',
    icon: 'scissors',
    tile: { bg: 'var(--purple-soft)', color: 'var(--purple)' },
    category: 'short',
  scene: 'daily',
    href: '/skills/film-commentary',
    backend: { kind: 'pipeline', id: 'video_understand', status: 'beta' },
  },
  {
    slug: 'product-360',
    name: '商品 360° 展示',
    desc: '一张商品图，生成环绕运镜展示视频，电商详情页首图直接能用。',
    flow: ['商品图', '环绕运镜', '展示片'],
    meta: '约 2-3 分钟 · 单图直出',
    icon: 'camera',
    tile: { bg: 'var(--blue-soft)', color: 'var(--blue)' },
    category: 'short',
  scene: 'commerce',
    href: '/skills/product-360',
    backend: { kind: 'pipeline', id: 'image_animate', status: 'beta' },
  },
  {
    slug: 'meme-factory',
    name: '表情包工厂',
    desc: '你的角色资产一键变 9 宫格表情包，梗文案自动配，涨粉利器。',
    flow: ['角色资产', '表情九宫格', '打包'],
    meta: '约 3-5 分钟 · 可打包商用',
    icon: 'smile',
    tile: { bg: 'var(--amber-soft)', color: '#B97A12' },
    category: 'short',
  scene: 'play',
    href: '/skills/meme-factory',
    backend: { kind: 'pipeline', id: 'meme_factory', status: 'beta' },
  },
  {
    slug: 'novel-promo',
    name: '小说推文视频',
    desc: '网文高光段落丢进来，自动配画面和悬疑感旁白，推文号日更神器。',
    flow: ['小说段落', '分镜画面', '解说片'],
    meta: '约 5-8 分钟',
    icon: 'book',
    tile: { bg: 'var(--pink-soft)', color: '#C24A7C' },
    category: 'short',
  scene: 'daily',
    href: '/skills/novel-promo',
    backend: { kind: 'pipeline', id: 'standard', status: 'beta' },
  },
  {
    slug: 'wedding-film',
    name: '婚礼纪念短片',
    desc: '照片集加爱情故事线，生成纪念短片——人生重要时刻值得被好好剪。',
    flow: ['照片集+故事', '分镜', '纪念短片'],
    meta: '约 10-15 分钟 · 情感向',
    icon: 'heart',
    tile: { bg: 'var(--red-soft)', color: 'var(--red)' },
    category: 'short',
  scene: 'memory',
    href: '/skills/wedding-film',
    backend: { kind: 'pipeline', id: 'standard', status: 'beta' },
  },
  {
    slug: 'game-highlight',
    name: '游戏高光二创',
    desc: '游戏录屏自动识别高光时刻，配解说字幕和卡点，集锦不再手工剪。',
    flow: ['游戏录屏', '高光识别', '集锦片'],
    meta: '约 8-12 分钟 · 需视频理解',
    icon: 'gamepad',
    tile: { bg: 'var(--purple-soft)', color: 'var(--purple)' },
    category: 'short',
  scene: 'daily',
    href: '/skills/game-highlight',
    backend: { kind: 'pipeline', id: 'video_understand', status: 'beta' },
  },
  {
    slug: 'brand-intro',
    name: '品牌片头动效',
    desc: 'Logo 图生成 3-5 秒品牌片头，接单副业直接从这条生产线起步。',
    flow: ['Logo', '动效方案', '片头视频'],
    meta: '约 3-5 分钟 · 可商用授权',
    icon: 'star',
    tile: { bg: 'var(--teal-soft)', color: 'var(--teal)' },
    category: 'short',
  scene: 'commerce',
    href: '/skills/brand-intro',
    backend: { kind: 'pipeline', id: 'image_animate', status: 'beta' },
  },
  {
    slug: 'recipe-video',
    name: '食谱视频',
    desc: '一段食谱文本，生成步骤展示短片，美食号起号最快的一条路。',
    flow: ['食谱文本', '步骤分镜', '展示片'],
    meta: '约 5-8 分钟',
    icon: 'coffee',
    tile: { bg: 'var(--green-soft)', color: 'var(--green)' },
    category: 'short',
  scene: 'daily',
    href: '/skills/recipe-video',
    backend: { kind: 'pipeline', id: 'standard', status: 'beta' },
  },
  {
    slug: 'knowledge-card',
    name: '知识卡片视频',
    desc: '知识点文本变图文讲解卡视频，知识区博主的内容流水线。',
    flow: ['知识点', '讲解卡', '成片'],
    meta: '约 4-6 分钟',
    icon: 'cap',
    tile: { bg: 'var(--blue-soft)', color: 'var(--blue)' },
    category: 'short',
  scene: 'daily',
    href: '/skills/knowledge-card',
    backend: { kind: 'pipeline', id: 'standard', status: 'beta' },
  },
];

export function getSkill(slug: string): Skill | undefined {
  return SKILLS.find((s) => s.slug === slug);
}
