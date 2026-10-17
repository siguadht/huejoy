import type { SkillBackend } from './skills';

/** 表单字段定义（数据驱动，覆盖全部已接入管线） */
export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'image' | 'video' | 'audio' | 'select' | 'number';
  placeholder?: string;
  options?: string[];
  default?: string | number;
  hint?: string;
  required?: boolean;
  /** select 多选：值以逗号分隔存储 */
  multiple?: boolean;
}

export interface SkillFormConfig {
  /** 对应 data/skills.ts 的 slug */
  slug: string;
  pipeline: 'standard' | 'action_transfer' | 'digital_human' | 'image_animate' | 'meme_factory' | 'video_understand' | 'song_mv' | 'audio_book';
  submitLabel: string;
  costHint: string;
  fields: FieldDef[];
  /** 由表单值 + 默认模型组装 pipeline 请求参数 */
  buildParams: (values: Record<string, any>, models: Record<string, string>) => Record<string, any>;
}

const TEXTAREA_ROWS = 3;

export const SKILL_FORMS: SkillFormConfig[] = [
  {
    slug: 'art-short-video',
    pipeline: 'standard',
    submitLabel: '生成短片',
    costHint: '约 3-5 分钟出片 · 生成过程可随时离开，完成后通知你',
    fields: [
      { key: 'text', label: '文案 / 灵感', type: 'textarea', required: true, placeholder: '例如：深秋的公园长椅，一片银杏叶落在翻开的书上……' },
      { key: 'title', label: '标题（选填）', type: 'text', placeholder: '例如：银杏与旧书' },
      { key: 'n_scenes', label: '画面数量', type: 'number', default: 5, hint: '1-20，文案会被切成对应段数的旁白' },
      {
        key: 'video_mode', label: '成片方式', type: 'select', default: 'image_concat',
        options: ['image_concat', 'dynamic_video'],
      },
      { key: 'video_ratio', label: '画面比例', type: 'select', default: '9:16', options: ['9:16', '1:1', '16:9'] },
      { key: 'style_control', label: '风格控制（选填）', type: 'text', placeholder: '例如：治愈系、紫色调、胶片质感' },
    ],
    buildParams: (v, m) => ({
      text: String(v.text || '').trim(),
      title: v.title ? String(v.title) : undefined,
      mode: 'inspiration',
      segment_count: Number(v.n_scenes) || 5,
      n_scenes: Number(v.n_scenes) || 5,
      video_mode: v.video_mode || 'image_concat',
      video_ratio: v.video_ratio || '9:16',
      style_control: v.style_control ? String(v.style_control) : undefined,
      generate_audio: true,
      llm_model: m.llm_model,
      image_model: m.image_t2i_model,
      video_model: m.video_first_frame_model || undefined,
    }),
  },
  {
    slug: 'digital-human',
    pipeline: 'digital_human',
    submitLabel: '合成口播视频',
    costHint: '约 3-5 分钟出片 · 生成过程可随时离开，完成后通知你',
    fields: [
      { key: 'character_image_path', label: '人物照片', type: 'image', required: true, hint: '正脸清晰、光线均匀的照片效果最好' },
      { key: 'goods_text', label: '口播文案', type: 'textarea', required: true, placeholder: '例如：大家好，今天给大家介绍一款我用了三个月的降噪耳机……' },
      { key: 'duration', label: '时长（秒）', type: 'number', default: 5 },
      { key: 'video_ratio', label: '画面比例', type: 'select', default: '9:16', options: ['9:16', '1:1', '16:9'] },
    ],
    buildParams: (v, m) => ({
      mode: 'customize',
      character_image_path: String(v.character_image_path || ''),
      goods_text: String(v.goods_text || '').trim(),
      duration: Number(v.duration) || 5,
      video_ratio: v.video_ratio || '9:16',
      llm_model: m.llm_model,
      image_model: m.image_t2i_model,
      video_model: m.video_first_frame_model,
    }),
  },
  {
    slug: 'ecommerce-product',
    pipeline: 'digital_human',
    submitLabel: '生成带货短片',
    costHint: '约 3-5 分钟出片 · 人物图 + 商品图双输入，口播与展示一次到位',
    fields: [
      { key: 'character_image_path', label: '人物照片', type: 'image', required: true, hint: '出镜口播的人物照片' },
      { key: 'goods_image_path', label: '商品图片', type: 'image', required: true, hint: '商品主图' },
      { key: 'goods_title', label: '商品名称', type: 'text', required: true, placeholder: '例如：雲南咖啡豆 500g' },
      { key: 'goods_text', label: '核心卖点（每行一条）', type: 'textarea', required: true, placeholder: '高海拔阿拉比卡豆\n中深烘焙，坚果巧克力风味\n48 小时内新鲜烘焙发货' },
      { key: 'duration', label: '时长（秒）', type: 'number', default: 5 },
      { key: 'video_ratio', label: '画面比例', type: 'select', default: '9:16', options: ['9:16', '1:1', '16:9'] },
    ],
    buildParams: (v, m) => ({
      mode: 'digital',
      character_image_path: String(v.character_image_path || ''),
      goods_image_path: String(v.goods_image_path || ''),
      goods_title: String(v.goods_title || '').trim(),
      goods_text: String(v.goods_text || '').trim(),
      duration: Number(v.duration) || 5,
      video_ratio: v.video_ratio || '9:16',
      llm_model: m.llm_model,
      image_model: m.image_t2i_model,
      video_model: m.video_first_frame_model,
    }),
  },
  {
    slug: 'motion-transfer',
    pipeline: 'action_transfer',
    submitLabel: '开始迁移',
    costHint: '约 2-4 分钟出片 · 角色图 + 动作视频，一键复刻名场面',
    fields: [
      { key: 'image_path', label: '角色图片', type: 'image', required: true },
      { key: 'video_path', label: '动作参考视频', type: 'video', required: true },
      { key: 'prompt_text', label: '动作描述', type: 'text', placeholder: '例如：保留参考视频中的运镜与动作节奏' },
      { key: 'duration', label: '时长（秒）', type: 'number', default: 5 },
      { key: 'video_ratio', label: '画面比例', type: 'select', default: '9:16', options: ['9:16', '1:1', '16:9'] },
    ],
    buildParams: (v, m) => ({
      image_path: String(v.image_path || ''),
      video_path: String(v.video_path || ''),
      prompt_text: String(v.prompt_text || '').trim(),
      duration: Number(v.duration) || 5,
      video_ratio: v.video_ratio || '9:16',
      video_model: m.video_reference_model || m.video_first_frame_model,
    }),
  },

  /* ============ 第二批接入：垂类模板 + 新管线 ============ */

  /* ---- A 组：standard 管线 + 场景化风格模板 ---- */
  {
    slug: 'audio-picture-book',
    pipeline: 'audio_book',
    submitLabel: '生成绘本短片',
    costHint: '约 5-8 分钟出片 · 故事自动分角色分镜，多角色配音 + 插图一次到位',
    fields: [
      { key: 'text', label: '故事文本', type: 'textarea', required: true, placeholder: '例如：小兔子灰灰在森林里迷路了，它一边走一边哭，这时候一只萤火虫飞了过来……' },
      { key: 'title', label: '标题（选填）', type: 'text', placeholder: '例如：森林里的萤火虫' },
      { key: 'n_scenes', label: '插图数量', type: 'number', default: 5, hint: '2-12，故事会被切成对应段数的分镜' },
      { key: 'voice_preset', label: '配音风格', type: 'select', default: 'storybook', options: ['storybook', 'theater', 'solo'], hint: 'storybook 温柔绘本 / theater 多人剧场 / solo 单旁白' },
      { key: 'video_ratio', label: '画面比例', type: 'select', default: '9:16', options: ['9:16', '1:1', '16:9'] },
      { key: 'style_control', label: '风格控制（选填）', type: 'text', placeholder: '例如：水彩绘本、紫色调、童话氛围', default: '温暖绘本插画风，柔和色调，童话氛围，画面简洁治愈，同一角色在不同画面中外观保持一致' },
    ],
    buildParams: (v, m) => ({
      text: String(v.text || '').trim(),
      title: v.title ? String(v.title) : undefined,
      segment_count: Number(v.n_scenes) || 5,
      voice_preset: v.voice_preset || 'storybook',
      video_ratio: v.video_ratio || '9:16',
      style_control: v.style_control ? String(v.style_control) : undefined,
      llm_model: m.llm_model,
      image_model: m.image_t2i_model,
    }),
  },
  {
    slug: 'recipe-video',
    pipeline: 'standard',
    submitLabel: '生成食谱短片',
    costHint: '约 5-8 分钟出片 · 食谱文本自动拆解为步骤分镜',
    fields: [
      { key: 'text', label: '食谱文本', type: 'textarea', required: true, placeholder: '例如：番茄炒蛋：1.鸡蛋打散加少许盐；2.番茄切块；3.热油下鸡蛋炒散盛出；4.番茄炒出汁，倒回鸡蛋翻炒均匀……' },
      { key: 'title', label: '菜名（选填）', type: 'text', placeholder: '例如：家常番茄炒蛋' },
      { key: 'n_scenes', label: '步骤画面数量', type: 'number', default: 5, hint: '1-20，每个步骤一张图' },
      { key: 'video_mode', label: '成片方式', type: 'select', default: 'image_concat', options: ['image_concat', 'dynamic_video'] },
      { key: 'video_ratio', label: '画面比例', type: 'select', default: '9:16', options: ['9:16', '1:1', '16:9'] },
      { key: 'style_control', label: '风格控制（选填）', type: 'text', placeholder: '例如：日式清新、暗调美食摄影', default: '美食摄影风格，明亮自然光，食材特写，让人有食欲' },
    ],
    buildParams: (v, m) => ({
      text: String(v.text || '').trim(),
      title: v.title ? String(v.title) : undefined,
      mode: 'inspiration',
      segment_count: Number(v.n_scenes) || 5,
      n_scenes: Number(v.n_scenes) || 5,
      video_mode: v.video_mode || 'image_concat',
      video_ratio: v.video_ratio || '9:16',
      style_control: v.style_control ? String(v.style_control) : undefined,
      generate_audio: true,
      llm_model: m.llm_model,
      image_model: m.image_t2i_model,
      video_model: m.video_first_frame_model || undefined,
    }),
  },
  {
    slug: 'knowledge-card',
    pipeline: 'standard',
    submitLabel: '生成讲解视频',
    costHint: '约 4-6 分钟出片 · 知识点变图文讲解卡，知识区博主流水线',
    fields: [
      { key: 'text', label: '知识点文本', type: 'textarea', required: true, placeholder: '例如：复利效应：利息计入本金再次生息。本金1万、年化10%，7年约翻倍，30年约17倍……' },
      { key: 'title', label: '标题（选填）', type: 'text', placeholder: '例如：3分钟看懂复利' },
      { key: 'n_scenes', label: '卡片数量', type: 'number', default: 5, hint: '1-20，每个知识点一张卡' },
      { key: 'video_mode', label: '成片方式', type: 'select', default: 'image_concat', options: ['image_concat', 'dynamic_video'] },
      { key: 'video_ratio', label: '画面比例', type: 'select', default: '9:16', options: ['9:16', '1:1', '16:9'] },
      { key: 'style_control', label: '风格控制（选填）', type: 'text', placeholder: '例如：科技风、深色背景、霓虹点缀', default: '信息图风格，扁平化设计，重点突出，清晰易懂' },
    ],
    buildParams: (v, m) => ({
      text: String(v.text || '').trim(),
      title: v.title ? String(v.title) : undefined,
      mode: 'inspiration',
      segment_count: Number(v.n_scenes) || 5,
      n_scenes: Number(v.n_scenes) || 5,
      video_mode: v.video_mode || 'image_concat',
      video_ratio: v.video_ratio || '9:16',
      style_control: v.style_control ? String(v.style_control) : undefined,
      generate_audio: true,
      llm_model: m.llm_model,
      image_model: m.image_t2i_model,
      video_model: m.video_first_frame_model || undefined,
    }),
  },
  {
    slug: 'novel-promo',
    pipeline: 'standard',
    submitLabel: '生成推文视频',
    costHint: '约 5-8 分钟出片 · 网文高光段落自动配悬疑感画面',
    fields: [
      { key: 'text', label: '小说段落', type: 'textarea', required: true, placeholder: '例如：他推开门，屋里一片漆黑。桌上摆着一封信，信封上是他的字迹——可他从来没写过这封信……' },
      { key: 'title', label: '标题（选填）', type: 'text', placeholder: '例如：深夜来信' },
      { key: 'n_scenes', label: '画面数量', type: 'number', default: 5, hint: '1-20' },
      { key: 'video_mode', label: '成片方式', type: 'select', default: 'image_concat', options: ['image_concat', 'dynamic_video'] },
      { key: 'video_ratio', label: '画面比例', type: 'select', default: '9:16', options: ['9:16', '1:1', '16:9'] },
      { key: 'style_control', label: '风格控制（选填）', type: 'text', placeholder: '例如：民国风、赛博朋克、治愈系', default: '悬疑电影感，暗调，氛围感强，镜头有张力' },
    ],
    buildParams: (v, m) => ({
      text: String(v.text || '').trim(),
      title: v.title ? String(v.title) : undefined,
      mode: 'inspiration',
      segment_count: Number(v.n_scenes) || 5,
      n_scenes: Number(v.n_scenes) || 5,
      video_mode: v.video_mode || 'image_concat',
      video_ratio: v.video_ratio || '9:16',
      style_control: v.style_control ? String(v.style_control) : undefined,
      generate_audio: true,
      llm_model: m.llm_model,
      image_model: m.image_t2i_model,
      video_model: m.video_first_frame_model || undefined,
    }),
  },
  {
    slug: 'wedding-film',
    pipeline: 'standard',
    submitLabel: '生成纪念短片',
    costHint: '约 10-15 分钟出片 · 情感向分镜，人生重要时刻值得被好好剪',
    fields: [
      { key: 'text', label: '爱情故事线', type: 'textarea', required: true, placeholder: '例如：2019年大学图书馆初遇，她借走了他排在前面的那本书；2021年一起养了第一只猫；2026年，他在这家图书馆向她求婚……' },
      { key: 'title', label: '短片标题（选填）', type: 'text', placeholder: '例如：我们的七年' },
      { key: 'n_scenes', label: '画面数量', type: 'number', default: 8, hint: '1-20' },
      { key: 'video_mode', label: '成片方式', type: 'select', default: 'image_concat', options: ['image_concat', 'dynamic_video'] },
      { key: 'video_ratio', label: '画面比例', type: 'select', default: '9:16', options: ['9:16', '1:1', '16:9'] },
      { key: 'style_control', label: '风格控制（选填）', type: 'text', placeholder: '例如：胶片质感、森系、复古', default: '温暖纪实风格，柔光，浪漫氛围，电影质感' },
    ],
    buildParams: (v, m) => ({
      text: String(v.text || '').trim(),
      title: v.title ? String(v.title) : undefined,
      mode: 'inspiration',
      segment_count: Number(v.n_scenes) || 8,
      n_scenes: Number(v.n_scenes) || 8,
      video_mode: v.video_mode || 'image_concat',
      video_ratio: v.video_ratio || '9:16',
      style_control: v.style_control ? String(v.style_control) : undefined,
      generate_audio: true,
      llm_model: m.llm_model,
      image_model: m.image_t2i_model,
      video_model: m.video_first_frame_model || undefined,
    }),
  },
  {
    slug: 'news-broadcast',
    pipeline: 'standard',
    submitLabel: '生成资讯短片',
    costHint: '约 5-8 分钟出片 · 关键词自动成稿，日更账号的体力活它包了',
    fields: [
      { key: 'text', label: '关键词 / 话题', type: 'text', required: true, placeholder: '例如：新能源汽车出海' },
      { key: 'title', label: '标题（选填）', type: 'text' },
      { key: 'n_scenes', label: '资讯条数', type: 'number', default: 4, hint: '1-20，脚本会被拆成对应段数' },
      { key: 'video_mode', label: '成片方式', type: 'select', default: 'image_concat', options: ['image_concat', 'dynamic_video'] },
      { key: 'video_ratio', label: '画面比例', type: 'select', default: '9:16', options: ['9:16', '1:1', '16:9'] },
      { key: 'style_control', label: '风格控制（选填）', type: 'text', placeholder: '例如：严肃正式、轻松快评', default: '新闻演播室风格，专业正式，画面稳重' },
    ],
    buildParams: (v, m) => ({
      text: String(v.text || '').trim(),
      title: v.title ? String(v.title) : undefined,
      mode: 'inspiration',
      segment_count: Number(v.n_scenes) || 4,
      n_scenes: Number(v.n_scenes) || 4,
      video_mode: v.video_mode || 'image_concat',
      video_ratio: v.video_ratio || '9:16',
      style_control: v.style_control ? String(v.style_control) : undefined,
      generate_audio: true,
      llm_model: m.llm_model,
      image_model: m.image_t2i_model,
      video_model: m.video_first_frame_model || undefined,
    }),
  },
  {
    slug: 'song-mv',
    pipeline: 'song_mv',
    submitLabel: '生成 MV',
    costHint: '约 5-10 分钟出片 · 上传歌曲自动分析节奏卡点，歌词分镜 + 主音轨替换',
    fields: [
      { key: 'audio_path', label: '歌曲音频', type: 'audio', required: true, hint: 'MP3 / WAV / M4A，将作为 MV 主音轨' },
      { key: 'text', label: '歌词', type: 'textarea', required: true, placeholder: '例如：\n午夜的风吹过空荡的街\n路灯把影子拉得很长\n我想起你说的那句话\n像一颗糖 含在嘴里化' },
      { key: 'title', label: '歌名（选填）', type: 'text', placeholder: '例如：午夜的街' },
      { key: 'n_scenes', label: '分镜数量', type: 'number', default: 6, hint: '2-12，按歌曲能量峰值自动卡点切换' },
      { key: 'video_ratio', label: '画面比例', type: 'select', default: '9:16', options: ['9:16', '1:1', '16:9'] },
      { key: 'style_control', label: '曲风 / 视觉风格（选填）', type: 'text', placeholder: '例如：city pop、霓虹夜色、复古胶片', default: '音乐MV视觉风格，节奏感强，画面与歌词情绪匹配' },
    ],
    buildParams: (v, m) => ({
      audio_path: String(v.audio_path || ''),
      lyrics: String(v.text || '').trim(),
      title: v.title ? String(v.title) : undefined,
      segment_count: Number(v.n_scenes) || 6,
      video_ratio: v.video_ratio || '9:16',
      style_control: v.style_control ? String(v.style_control) : undefined,
      llm_model: m.llm_model,
      image_model: m.image_t2i_model,
    }),
  },

  /* ---- B 组：数字人多语言（digital_human 多语言模式） ---- */
  {
    slug: 'digital-human-i18n',
    pipeline: 'digital_human',
    submitLabel: '生成多语言口播',
    costHint: '约 5-10 分钟出片 · 一条文案输出多语言版本，音色保持一致',
    fields: [
      { key: 'character_image_path', label: '人物照片', type: 'image', required: true, hint: '正脸清晰、光线均匀的照片效果最好' },
      { key: 'goods_text', label: '口播文案', type: 'textarea', required: true, placeholder: '例如：大家好，今天给大家介绍一款我用了三个月的降噪耳机……' },
      {
        key: 'languages', label: '输出语言（可多选）', type: 'select', multiple: true,
        default: '中文,英语,日语,韩语',
        options: ['中文', '英语', '日语', '韩语', '法语', '德语', '西班牙语', '俄语'],
        hint: '至少选择 2 种语言，将自动翻译并逐语言合成',
      },
      { key: 'video_ratio', label: '画面比例', type: 'select', default: '9:16', options: ['9:16', '1:1', '16:9'] },
    ],
    buildParams: (v, m) => {
      const langMap: Record<string, string> = {
        '中文': 'zh', '英语': 'en', '日语': 'ja', '韩语': 'ko',
        '法语': 'fr', '德语': 'de', '西班牙语': 'es', '俄语': 'ru',
      };
      const codes = String(v.languages || '').split(',').filter(Boolean).map((l) => langMap[l] || l);
      return {
        mode: 'customize',
        character_image_path: String(v.character_image_path || ''),
        goods_text: String(v.goods_text || '').trim(),
        languages: codes.length >= 2 ? codes : ['zh', 'en'],
        video_ratio: v.video_ratio || '9:16',
        llm_model: m.llm_model,
        image_model: m.image_t2i_model,
        video_model: m.video_first_frame_model,
      };
    },
  },

  /* ---- C 组：image_animate 管线（单图 + 运镜） ---- */
  {
    slug: 'product-360',
    pipeline: 'image_animate',
    submitLabel: '生成展示视频',
    costHint: '约 2-3 分钟出片 · 一张商品图直出环绕运镜展示片',
    fields: [
      { key: 'image_path', label: '商品图片', type: 'image', required: true, hint: '白底或干净背景的商品主图效果最好' },
      {
        key: 'motion', label: '运镜方式', type: 'select', default: 'orbit',
        options: ['orbit', 'zoom_in', 'zoom_out', 'pan', 'reveal'],
        hint: 'orbit=环绕 · zoom_in=推近 · zoom_out=拉远 · pan=横移 · reveal=揭幕',
      },
      { key: 'prompt_text', label: '自定义运镜描述（选填）', type: 'text', placeholder: '留空则按所选运镜方式自动生成' },
      { key: 'duration', label: '时长（秒）', type: 'number', default: 5 },
      { key: 'video_ratio', label: '画面比例', type: 'select', default: '1:1', options: ['9:16', '1:1', '16:9'] },
    ],
    buildParams: (v, m) => ({
      image_path: String(v.image_path || ''),
      motion: v.motion || 'orbit',
      prompt_text: v.prompt_text ? String(v.prompt_text) : undefined,
      duration: Number(v.duration) || 5,
      video_ratio: v.video_ratio || '1:1',
      video_model: m.video_first_frame_model,
    }),
  },
  {
    slug: 'brand-intro',
    pipeline: 'image_animate',
    submitLabel: '生成品牌片头',
    costHint: '约 3-5 分钟出片 · Logo 图生成 3-5 秒品牌片头动效',
    fields: [
      { key: 'image_path', label: 'Logo 图片', type: 'image', required: true, hint: '清晰的 Logo 图，PNG 透明底或深色底均可' },
      {
        key: 'motion', label: '动效方案', type: 'select', default: 'reveal',
        options: ['reveal', 'zoom_in', 'zoom_out', 'orbit', 'pan'],
      },
      { key: 'prompt_text', label: '动效描述（选填）', type: 'text', placeholder: '例如：光线扫过 Logo，粒子缓缓聚集' },
      { key: 'duration', label: '时长（秒）', type: 'number', default: 5, hint: '3-5 秒最适合片头' },
      { key: 'video_ratio', label: '画面比例', type: 'select', default: '16:9', options: ['9:16', '1:1', '16:9'] },
    ],
    buildParams: (v, m) => ({
      image_path: String(v.image_path || ''),
      motion: v.motion || 'reveal',
      prompt_text: v.prompt_text ? String(v.prompt_text) : undefined,
      duration: Number(v.duration) || 5,
      video_ratio: v.video_ratio || '16:9',
      video_model: m.video_first_frame_model,
    }),
  },

  /* ---- D 组：meme_factory 管线（九宫格表情包） ---- */
  {
    slug: 'meme-factory',
    pipeline: 'meme_factory',
    submitLabel: '生成表情包',
    costHint: '约 3-5 分钟出片 · 角色资产一键变九宫格表情包，自动打包',
    fields: [
      { key: 'image_path', label: '角色图片', type: 'image', required: true, hint: '角色特征明显的立绘或头像效果最好' },
      { key: 'meme_count', label: '表情数量', type: 'number', default: 9, hint: '1-9 张，默认九宫格' },
      { key: 'style_hint', label: '风格要求（选填）', type: 'text', placeholder: '例如：简笔画线条、像素风、夸张表情' },
    ],
    buildParams: (v, m) => ({
      image_path: String(v.image_path || ''),
      meme_count: Math.max(1, Math.min(9, Number(v.meme_count) || 9)),
      style_hint: v.style_hint ? String(v.style_hint) : undefined,
      image_model: m.image_it2i_model || m.image_t2i_model,
    }),
  },

  /* ---- E 组：video_understand 管线（视频理解二创） ---- */
  {
    slug: 'film-commentary',
    pipeline: 'video_understand',
    submitLabel: '生成解说片',
    costHint: '约 15-25 分钟出片 · 自动抽帧理解剧情，重写解说并配画面',
    fields: [
      { key: 'video_path', label: '影视 / 视频文件', type: 'video', required: true, hint: 'MP4 / MOV，建议 10 分钟以内的片段' },
      { key: 'focus_text', label: '解说侧重（选填）', type: 'text', placeholder: '例如：重点讲主角的心理变化' },
      { key: 'segment_count', label: '解说段数', type: 'number', default: 6, hint: '3-12 段' },
      { key: 'video_ratio', label: '画面比例', type: 'select', default: '9:16', options: ['9:16', '1:1', '16:9'] },
    ],
    buildParams: (v, m) => ({
      video_path: String(v.video_path || ''),
      scene: 'commentary',
      focus_text: v.focus_text ? String(v.focus_text) : undefined,
      segment_count: Math.max(3, Math.min(12, Number(v.segment_count) || 6)),
      video_ratio: v.video_ratio || '9:16',
      vlm_model: m.vlm_model,
      llm_model: m.llm_model,
      image_model: m.image_t2i_model,
    }),
  },
  {
    slug: 'game-highlight',
    pipeline: 'video_understand',
    submitLabel: '生成集锦片',
    costHint: '约 8-12 分钟出片 · 抽帧理解游戏画面，自动写集锦解说配卡点',
    fields: [
      { key: 'video_path', label: '游戏录屏', type: 'video', required: true, hint: 'MP4 / MOV，建议 10 分钟以内' },
      { key: 'focus_text', label: '集锦侧重（选填）', type: 'text', placeholder: '例如：只保留五杀时刻' },
      { key: 'segment_count', label: '解说段数', type: 'number', default: 5, hint: '3-12 段' },
      { key: 'video_ratio', label: '画面比例', type: 'select', default: '9:16', options: ['9:16', '1:1', '16:9'] },
    ],
    buildParams: (v, m) => ({
      video_path: String(v.video_path || ''),
      scene: 'highlight',
      focus_text: v.focus_text ? String(v.focus_text) : undefined,
      segment_count: Math.max(3, Math.min(12, Number(v.segment_count) || 5)),
      video_ratio: v.video_ratio || '9:16',
      vlm_model: m.vlm_model,
      llm_model: m.llm_model,
      image_model: m.image_t2i_model,
    }),
  },
];

export function getSkillForm(slug: string): SkillFormConfig | undefined {
  return SKILL_FORMS.find((f) => f.slug === slug);
}

/** 已接入后端（可真实开拍）的技能 slug 集合 */
export function isWired(slug: string, backend: SkillBackend): boolean {
  return backend.kind === 'workflow' || backend.kind === 'pipeline';
}

export { TEXTAREA_ROWS };
