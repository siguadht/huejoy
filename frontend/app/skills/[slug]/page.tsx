import { Icon } from '@/components/Icon';
import Link from 'next/link';
import { getSkill, SKILLS } from '@/data/skills';
import { getSkillForm } from '@/data/skillForms';
import { notFound } from 'next/navigation';
import SkillRunner from '@/components/SkillRunner';

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const skill = getSkill(slug);
  if (!skill) notFound();

  /* ---- 规划中技能：诚实降级，不假装能跑 ---- */
  if (skill.backend.kind === 'none') {
    const alternatives = SKILLS.filter((s) => s.backend.kind !== 'none' && s.slug !== skill.slug).slice(0, 4);
    return (
      <div>
        <div className="skill-head">
          <div className="tile"><Icon name={skill.icon} /></div>
          <div>
            <h1>{skill.name}<span className="tag tag-amber">即将上线</span></h1>
            <div className="sub">{skill.desc}</div>
          </div>
        </div>
        <div className="card panel" style={{ marginTop: 16 }}>
          <h3><Icon name="clock" />这条生产线正在组装</h3>
          <p className="desc" style={{ margin: '8px 0 12px' }}>
            后端管线与前端表单都在打磨中，上线后这里会直接开拍。技能框架已就绪，新管线接上即上线——期间可以先用下面这些已接入的技能。
          </p>
          <div className="flow">
            {skill.flow.map((step, i) => (
              <span key={step}>
                {i > 0 && <Icon name="arrow-right" className="ic ic-sm" />}
                {i === 0 || i === skill.flow.length - 1 ? <b>{step}</b> : <span>{step}</span>}
              </span>
            ))}
          </div>
        </div>
        {alternatives.length > 0 && (
          <div className="card panel" style={{ marginTop: 16 }}>
            <h3><Icon name="sparkles" />已接入，现在就能拍</h3>
            <div className="grid grid-2" style={{ marginTop: 12 }}>
              {alternatives.map((s) => (
                <Link key={s.slug} className="skill-card" href={s.href}>
                  <div className="skill-tile" style={{ background: s.tile.bg, color: s.tile.color }}>
                    <Icon name={s.icon} />
                  </div>
                  <h3>{s.name}</h3>
                  <p className="desc">{s.desc}</p>
                  <div className="meta"><Icon name="clock" className="ic ic-sm" />{s.meta}</div>
                </Link>
              ))}
            </div>
          </div>
        )}
        <div style={{ marginTop: 16 }}>
          <Link className="btn btn-outline" href="/skills">← 返回技能库</Link>
        </div>
      </div>
    );
  }

  /* ---- 短片创作（6 阶段工作流）：入口就是创作台 ---- */
  if (skill.backend.kind === 'workflow') {
    const stageRows: Array<[string, string]> = [
      ['剧本生成', '一句灵感 → 结构化剧本，可改可续'],
      ['角色/场景设计', '角色三视图 + 场景参考图'],
      ['分镜设计', '镜头语言 + 逐镜画面提示词'],
      ['参考图生成', '高精度参考图，返工成本最低的刹车点'],
      ['视频生成', '参考图 → 视频片段，最耗时阶段'],
      ['后期剪辑', '拼接、配乐、字幕，出成片'],
    ];
    return (
      <div>
        <div className="skill-head">
          <div className="tile"><Icon name={skill.icon} /></div>
          <div>
            <h1>{skill.name}<span className="tag tag-primary">主力</span></h1>
            <div className="sub">{skill.desc}</div>
          </div>
        </div>
        <div className="card panel" style={{ marginTop: 16 }}>
          <h3><Icon name="film" />6 阶段全流程</h3>
          <div style={{ marginTop: 12 }}>
            {stageRows.map(([name, desc], i) => (
              <div key={name} className="kv">
                <span className="k">{['①', '②', '③', '④', '⑤', '⑥'][i]} {name}</span>
                <span className="v" style={{ fontSize: 13 }}>{desc}</span>
              </div>
            ))}
          </div>
          <div className="cost" style={{ marginTop: 14 }}>
            <Icon name="clock" className="ic ic-sm" />
            {skill.meta} · 每阶段产物可确认、可单独重做
          </div>
          <Link className="btn btn-primary btn-lg" href="/" style={{ width: '100%', marginTop: 12 }}>
            <Icon name="zap" className="ic ic-sm" />去创作台开拍
          </Link>
          <p className="desc" style={{ marginTop: 10 }}>
            这条生产线没有独立表单——创作台就是它的驾驶舱：输入一句话即创建会话，等待页实时跟进 6 阶段进度，自动挡一路跑到底，专手动逐步确认。
          </p>
        </div>
        <div style={{ marginTop: 16 }}>
          <Link className="btn btn-outline" href="/skills">← 返回技能库</Link>
        </div>
      </div>
    );
  }

  /* ---- 一键短流程技能：真实表单 + 真实任务 ---- */
  const form = getSkillForm(skill.slug);
  return (
    <div>
      <div className="skill-head">
        <div className="tile"><Icon name={skill.icon} /></div>
        <div>
          <h1>
            {skill.name}
            {skill.badge && <span className={`tag ${skill.badge.cls}`}>{skill.badge.text}</span>}
          </h1>
          <div className="sub">{skill.desc}</div>
        </div>
      </div>

      <div className="steps">
        {skill.flow.map((step, i) => (
          <div key={step} className={`step${i === 0 ? ' active' : ''}`}><span className="n">{i + 1}</span>{step}</div>
        ))}
      </div>

      {form ? <SkillRunner slug={skill.slug} /> : null}

      <div style={{ marginTop: 16 }}>
        <Link className="btn btn-outline" href="/skills">← 返回技能库</Link>
      </div>
    </div>
  );
}
