import type { IconName } from '@/components/Icon';

export interface Project {
  id: string;
  name: string;
  /** 所属技能名 */
  skill: string;
  icon: IconName;
  /** 封面渐变（彩色四用之三：作品封面） */
  cover: string;
  status: string;
  statusCls: string;
  /** 项目库卡片 meta 行 */
  meta: string;
  /** 进度 0-100（生成中/待确认才有） */
  progress?: number;
  /** 首页「进行中」卡片扩展字段 */
  stage?: string;
  elapsed?: string;
  eta?: string;
  /** 首页「进行中」卡片专用 meta 文案（与项目库卡片略有差异） */
  homeMeta?: string;
  href?: string;
}

/** 模拟项目数据（与 P0 原型 home/projects 一致；P2 接真实任务列表） */
export const PROJECTS: Project[] = [
  {
    id: 'orange-cat-store',
    name: '橘猫便利店',
    skill: '短片创作',
    icon: 'film',
    cover: 'linear-gradient(135deg,#B9A8F0,#6E56CF)',
    status: '生成中',
    statusCls: 'tag-blue',
    meta: '短片创作 · 4 集 · 分镜设计 68%',
    progress: 46,
    stage: '第 3/6 阶段：分镜设计',
    elapsed: '已跑 12 分钟',
    eta: '预计还需 8 分钟',
    href: '/waiting',
  },
  {
    id: 'yunnan-coffee',
    name: '雲南咖啡豆开箱',
    skill: '电商产品片',
    icon: 'megaphone',
    cover: 'linear-gradient(135deg,#C7B8F5,#8B5CF6)',
    status: '待确认',
    statusCls: 'tag-amber',
    meta: '电商产品片 · 脚本待确认',
    progress: 70,
    href: '/skills/ecommerce-product',
  },
  {
    id: 'wuxia-trailer',
    name: '国风武侠预告',
    skill: '短片创作',
    icon: 'check',
    cover: 'linear-gradient(135deg,#A8E6CF,#1FA98C)',
    status: '已完成',
    statusCls: 'tag-green',
    meta: '短片创作 · 1 集 · 00:47 · 昨天 21:14',
  },
  {
    id: 'summer-cicada',
    name: '夏夜蝉鸣 · MV',
    skill: '歌曲 MV',
    icon: 'music',
    cover: 'linear-gradient(135deg,#F5C4D1,#EC6B9E)',
    status: '已完成',
    statusCls: 'tag-green',
    meta: '歌曲 MV · 03:12 · 10 月 8 日',
  },
  {
    id: 'moon-postman',
    name: '月亮邮递员',
    skill: '有声绘本',
    icon: 'book',
    cover: 'linear-gradient(135deg,#9BD4FF,#3AA7F5)',
    status: '已完成',
    statusCls: 'tag-green',
    meta: '有声绘本 · 6 分钟 · 10 月 6 日',
  },
  {
    id: 'old-alley-tailor',
    name: '旧巷裁缝铺',
    skill: '短片创作',
    icon: 'refresh',
    cover: 'linear-gradient(135deg,#D3D1C7,#888780)',
    status: '已失败',
    statusCls: 'tag-gray',
    meta: '短片创作 · 视频生成阶段超时 · 10 月 5 日',
  },
];

/** 素材库（项目页底部，跨项目沉淀） */
export const ASSET_GROUPS = [
  { icon: 'user' as IconName, bg: 'var(--primary-soft)', color: 'var(--primary)', name: '角色资产', desc: '橘猫、青年、月亮邮递员…', n: 12 },
  { icon: 'image' as IconName, bg: 'var(--blue-soft)', color: 'var(--blue)', name: '场景资产', desc: '便利店、雨夜街口、旧巷…', n: 8 },
  { icon: 'film' as IconName, bg: 'var(--green-soft)', color: 'var(--green)', name: '参考图 / 分镜', desc: '可复用的镜头与提示词', n: 46 },
];
