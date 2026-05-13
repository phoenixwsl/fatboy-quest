"""Build self-contained preview HTML for v4: 64 character × state combinations.

All 64 SVGs are inlined; single-file double-click experience.
"""
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
CHAR_DIR = os.path.join(ROOT, 'svg', 'characters')
OUT = os.path.join(ROOT, 'preview.html')

STATES = [
    ('default',   '默认'),
    ('thinking',  '思考'),
    ('focused',   '专注'),
    ('tense',     '紧张'),
    ('victory',   '胜利'),
    ('celebrate', '庆祝'),
    ('resting',   '休息'),
    ('sleeping',  '睡眠'),
]

CHARACTERS = [
    ('default',   '原版肥仔',   '最初的样子',          '#F4C752'),
    ('racer',     '赛车手',     '风驰电掣的肥仔',      '#E53935'),
    ('astronaut', '宇航员',     '飞向群星的肥仔',      '#1976D2'),
    ('pirate',    '海盗船长',   '寻找宝藏的肥仔',      '#37474F'),
    ('ninja',     '忍者',       '隐入暗影的肥仔',      '#263238'),
    ('mario',     '水管工',     '一路向前的肥仔',      '#E53935'),
    ('knight',    '骑士',       '荣耀守护的肥仔',      '#90A4AE'),
    ('wizard',    '魔法师',     '掌握咒语的肥仔',      '#9C27B0'),
]


def read_svg(char_id, state):
    path = os.path.join(CHAR_DIR, char_id, f'{state}.svg')
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


def with_size(svg, size):
    return svg.replace(
        '<svg viewBox',
        f'<svg width="{size}" height="{int(size * 320 / 280)}" viewBox',
        1,
    )


ANIM_FOR_STATE = {
    'default':   'anim-breathe',
    'thinking':  '',
    'focused':   '',
    'tense':     'anim-shake',
    'victory':   'anim-bounce',
    'celebrate': 'anim-wobble',
    'resting':   'anim-breathe-slow',
    'sleeping':  'anim-sleepbob',
}


# =====================================================
#  PART ONE — 8×8 matrix (the headline)
# =====================================================
def matrix_section():
    head_cells = ''.join(
        f'<th><div class="m-head"><div class="m-head-cn">{cn}</div><div class="m-head-en">{en}</div></div></th>'
        for en, cn in STATES
    )
    rows = []
    for char_id, char_cn, _, theme in CHARACTERS:
        row_cells = ''.join(
            f'<td><div class="m-cell">{with_size(read_svg(char_id, state), 100)}</div></td>'
            for state, _ in STATES
        )
        rows.append(f'''
        <tr>
          <th class="m-row-label" style="--char-theme: {theme}">
            <div class="m-row-cn">{char_cn}</div>
            <div class="m-row-en">{char_id}</div>
          </th>
          {row_cells}
        </tr>''')
    return f'''
    <table class="matrix">
      <thead>
        <tr><th></th>{head_cells}</tr>
      </thead>
      <tbody>{''.join(rows)}</tbody>
    </table>
    '''


# =====================================================
#  PART TWO — character hero + grid
# =====================================================
def character_card(char_id, name_cn, tagline, theme, size=200):
    svg = with_size(read_svg(char_id, 'default'), size)
    return f'''
    <div class="char-card" style="--char-theme: {theme}">
      <div class="char-card-bg"></div>
      <div class="char-svg">{svg}</div>
      <div class="char-info">
        <div class="char-name">{name_cn}</div>
        <div class="char-id">{char_id}</div>
        <div class="char-tag">{tagline}</div>
      </div>
    </div>'''


def character_section():
    cards = '\n'.join(character_card(c, n, t, th) for c, n, t, th in CHARACTERS)
    return f'<div class="char-grid">{cards}</div>'


# =====================================================
#  PART THREE — state grid (default character only, full details)
# =====================================================
STATE_DETAIL = {
    'default':   ('站立微笑',  '首页、家长面板'),
    'thinking':  ('撑下巴想',  '规划页、商店'),
    'focused':   ('握拳准备',  '闯关准备、倒计时'),
    'tense':     ('咬牙坚持',  '倒计时最后5分钟'),
    'victory':   ('举手大笑',  '击败瞬间'),
    'celebrate': ('撒花欢呼',  '段位升级、成就解锁'),
    'resting':   ('闭眼喝茶',  '等待评分'),
    'sleeping':  ('Z字飘升',  '夜间、长期未操作'),
}


def state_card(state, name_cn, size=170, character='default', anim=True):
    svg = with_size(read_svg(character, state), size)
    mood, where = STATE_DETAIL[state]
    cls = ANIM_FOR_STATE.get(state, '') if anim else ''
    return f'''
    <div class="card">
      <div class="card-svg {cls}">{svg}</div>
      <div class="card-name">{name_cn}</div>
      <div class="card-id">{state}</div>
      <div class="card-desc">{mood}<br><span class="muted">{where}</span></div>
    </div>'''


def state_section():
    cards = '\n'.join(state_card(s, n) for s, n in STATES)
    return f'<div class="grid">{cards}</div>'


# =====================================================
#  PART FOUR — animations across characters
# =====================================================
def anim_demo_section():
    return '\n'.join([
        f'''<div class="card">
          <div class="card-svg anim-breathe">{with_size(read_svg('default', 'default'), 170)}</div>
          <div class="card-name">原版 · 呼吸</div>
          <div class="card-id">breathe</div>
        </div>''',
        f'''<div class="card">
          <div class="card-svg anim-shake">{with_size(read_svg('racer', 'tense'), 170)}</div>
          <div class="card-name">赛车手 · 紧张</div>
          <div class="card-id">shake</div>
        </div>''',
        f'''<div class="card">
          <div class="card-svg anim-bounce">{with_size(read_svg('astronaut', 'victory'), 170)}</div>
          <div class="card-name">宇航员 · 击败</div>
          <div class="card-id">bounce</div>
        </div>''',
        f'''<div class="card">
          <div class="card-svg anim-wobble">{with_size(read_svg('mario', 'celebrate'), 170)}</div>
          <div class="card-name">马里奥 · 庆祝</div>
          <div class="card-id">wobble</div>
        </div>''',
        f'''<div class="card">
          <div class="card-svg anim-sleepbob">{with_size(read_svg('ninja', 'sleeping'), 170)}</div>
          <div class="card-name">忍者 · 睡眠</div>
          <div class="card-id">sleepbob</div>
        </div>''',
    ])


# =====================================================
#  PART FIVE — scene previews
# =====================================================
def scene_card(char_id, state, label, headline, sub, anim_cls='', highlight=False):
    svg = with_size(read_svg(char_id, state), 96)
    bg = 'background: linear-gradient(135deg, rgba(255,209,92,0.12), rgba(167,139,250,0.06));' if highlight else ''
    return f'''
    <div class="ctx-card" style="{bg}">
      <div class="ctx-label">{label}</div>
      <div class="ctx-body">
        <div class="ctx-svg {anim_cls}">{svg}</div>
        <div class="ctx-text">
          <div class="ctx-headline">{headline}</div>
          <div class="ctx-sub">{sub}</div>
        </div>
      </div>
    </div>'''


def scenes_section():
    return '\n'.join([
        scene_card('default', 'default', 'SCENE · 首页问候', '下午好，肥仔', '今天还有 2 只小怪等着', 'anim-breathe'),
        scene_card('racer', 'focused', 'SCENE · 闯关准备', '下一只小怪', '神机妙算 · 25 分钟 · ⭐ 20'),
        scene_card('racer', 'tense', 'SCENE · 倒计时末段', '02:18', '最后冲刺', 'anim-shake'),
        scene_card('astronaut', 'victory', 'SCENE · 击败瞬间', '击败！', '+20 积分到账 ✨', 'anim-bounce', highlight=True),
        scene_card('mario', 'celebrate', 'SCENE · 段位升级', '青铜战士', '你已经不是新兵了', 'anim-wobble'),
        scene_card('knight', 'sleeping', 'SCENE · 深夜模式', '骑士睡着了', '明天再来打怪吧', 'anim-sleepbob'),
    ])


# =====================================================
#  CSS
# =====================================================
CSS = '''
:root {
  --bg-deep: #0B1026;
  --bg-card: #151B3D;
  --fatboy-gold: #F4C752;
  --energy-purple: #A78BFA;
  --celebrate-gold: #FFD15C;
  --battle-red: #FF6B6B;
  --text-primary: #FFFFFF;
  --text-secondary: rgba(255,255,255,0.6);
  --text-tertiary: rgba(255,255,255,0.35);
  --border-soft: rgba(167,139,250,0.15);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  background: var(--bg-deep);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  min-height: 100vh;
  overflow-x: hidden;
}
body::before {
  content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image:
    radial-gradient(2px 2px at 12% 18%, rgba(255,255,255,0.6), transparent),
    radial-gradient(1.5px 1.5px at 28% 65%, rgba(255,255,255,0.5), transparent),
    radial-gradient(2px 2px at 48% 12%, rgba(255,255,255,0.7), transparent),
    radial-gradient(1.5px 1.5px at 78% 38%, rgba(255,255,255,0.4), transparent),
    radial-gradient(2px 2px at 88% 78%, rgba(255,255,255,0.5), transparent),
    radial-gradient(1px 1px at 62% 82%, rgba(167,139,250,0.4), transparent),
    radial-gradient(1.5px 1.5px at 15% 88%, rgba(255,255,255,0.5), transparent);
}
.container { position: relative; z-index: 1; max-width: 1280px; margin: 0 auto; padding: 48px 24px 96px; }
header { margin-bottom: 48px; }
.eyebrow { font-size: 12px; letter-spacing: 0.18em; color: var(--fatboy-gold); text-transform: uppercase; margin-bottom: 12px; }
h1 { font-size: 40px; font-weight: 800; letter-spacing: -0.01em; margin-bottom: 12px; }
.subtitle { color: var(--text-secondary); font-size: 15px; max-width: 720px; line-height: 1.75; }
section { margin-top: 72px; }
.section-title { font-size: 13px; letter-spacing: 0.15em; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 8px; }
.section-headline { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
.section-lead { color: var(--text-secondary); font-size: 14px; margin-bottom: 28px; max-width: 680px; line-height: 1.65; }

/* ===== Matrix ===== */
.matrix-wrap { overflow-x: auto; border-radius: 18px; border: 1px solid var(--border-soft); background: rgba(21,27,61,0.4); }
.matrix { border-collapse: separate; border-spacing: 6px; width: 100%; padding: 8px; }
.matrix th, .matrix td { padding: 0; }
.matrix thead th { height: 48px; padding-bottom: 8px; }
.m-head { text-align: center; }
.m-head-cn { font-size: 13px; font-weight: 700; color: var(--text-primary); }
.m-head-en { font-size: 10px; color: var(--text-tertiary); font-family: 'SF Mono', Menlo, monospace; margin-top: 2px; }
.m-row-label { padding-right: 12px; text-align: right; width: 90px; }
.m-row-cn { font-size: 14px; font-weight: 800; color: var(--char-theme); }
.m-row-en { font-size: 10px; color: var(--text-tertiary); font-family: 'SF Mono', Menlo, monospace; margin-top: 2px; }
.m-cell {
  width: 116px; height: 130px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(21,27,61,0.55);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.2s ease;
}
.m-cell:hover {
  transform: scale(1.1);
  border-color: rgba(167,139,250,0.4);
  z-index: 10;
  position: relative;
  box-shadow: 0 12px 30px rgba(0,0,0,0.5);
}
.m-cell svg { display: block; }

/* ===== Character cards ===== */
.char-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 18px; }
.char-card {
  position: relative;
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: 22px;
  padding: 20px 16px 18px;
  overflow: hidden;
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}
.char-card:hover {
  transform: translateY(-6px);
  border-color: var(--char-theme);
  box-shadow: 0 20px 50px rgba(0,0,0,0.4), 0 0 24px color-mix(in srgb, var(--char-theme) 25%, transparent);
}
.char-card-bg {
  position: absolute; inset: 0; opacity: 0.7; pointer-events: none;
  background: radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--char-theme) 22%, transparent), transparent 65%);
}
.char-svg { position: relative; display: flex; justify-content: center; align-items: center; height: 240px; }
.char-svg svg { display: block; }
.char-info { position: relative; text-align: center; margin-top: 8px; }
.char-name { font-size: 19px; font-weight: 800; color: var(--char-theme); letter-spacing: 0.01em; }
.char-id { font-size: 11px; color: var(--text-tertiary); font-family: 'SF Mono', Menlo, monospace; margin-top: 4px; }
.char-tag { font-size: 13px; color: var(--text-secondary); margin-top: 8px; }

/* ===== State / animation cards ===== */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
.card { background: var(--bg-card); border: 1px solid var(--border-soft); border-radius: 18px; padding: 16px 14px 18px; display: flex; flex-direction: column; align-items: center; transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.25s ease; }
.card:hover { transform: translateY(-4px); border-color: rgba(167,139,250,0.4); box-shadow: 0 16px 40px rgba(167,139,250,0.18); }
.card-svg { display: flex; align-items: center; justify-content: center; height: 190px; }
.card-svg svg { display: block; max-width: 100%; height: auto; }
.card-name { margin-top: 8px; font-weight: 700; font-size: 16px; color: var(--fatboy-gold); }
.card-id { margin-top: 3px; font-size: 10px; color: var(--text-tertiary); font-family: 'SF Mono', Menlo, monospace; }
.card-desc { margin-top: 8px; font-size: 12px; color: var(--text-secondary); text-align: center; line-height: 1.6; }
.muted { color: var(--text-tertiary); font-size: 10.5px; }

/* ===== Scene cards ===== */
.context-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.ctx-card { background: var(--bg-card); border: 1px solid var(--border-soft); border-radius: 18px; padding: 20px 22px; min-height: 140px; display: flex; flex-direction: column; }
.ctx-label { font-size: 10px; letter-spacing: 0.18em; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 14px; }
.ctx-body { flex: 1; display: flex; align-items: center; gap: 14px; }
.ctx-svg svg { display: block; }
.ctx-text { flex: 1; }
.ctx-headline { font-size: 22px; font-weight: 700; letter-spacing: -0.01em; }
.ctx-sub { color: var(--text-secondary); font-size: 13px; margin-top: 4px; }

/* ===== Animations ===== */
@keyframes breathe       { 0%,100% { transform: scale(1); } 50% { transform: scale(1.035); } }
@keyframes breathe-slow  { 0%,100% { transform: scale(1); } 50% { transform: scale(1.02); } }
@keyframes bounce        { 0% { transform: translateY(0) scale(1);} 30% { transform: translateY(-22px) scale(1.06);} 60% { transform: translateY(0) scale(.98);} 100% { transform: translateY(0) scale(1);} }
@keyframes wobble        { 0%,100% { transform: rotate(-5deg);} 50% { transform: rotate(5deg);} }
@keyframes shake         { 0%,100% { transform: translateX(0);} 25% { transform: translateX(-3px);} 75% { transform: translateX(3px);} }
@keyframes sleepbob      { 0%,100% { transform: translateY(0);} 50% { transform: translateY(-4px);} }

.anim-breathe       { animation: breathe        3.2s ease-in-out infinite; transform-origin: 50% 85%; }
.anim-breathe-slow  { animation: breathe-slow   4.5s ease-in-out infinite; transform-origin: 50% 85%; }
.anim-bounce        { animation: bounce         1.4s cubic-bezier(.34,1.56,.64,1) infinite; }
.anim-wobble        { animation: wobble         1.4s ease-in-out infinite; transform-origin: 50% 90%; }
.anim-shake         { animation: shake          0.45s ease-in-out infinite; }
.anim-sleepbob      { animation: sleepbob       3.4s ease-in-out infinite; }

footer { margin-top: 96px; padding-top: 32px; border-top: 1px solid var(--border-soft); color: var(--text-tertiary); font-size: 12px; line-height: 1.85; }
footer code { background: rgba(167,139,250,0.1); color: var(--energy-purple); padding: 2px 6px; border-radius: 4px; font-family: 'SF Mono', Menlo, monospace; font-size: 11px; }
'''


html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>肥仔 · v4 · 角色×状态全矩阵</title>
<style>{CSS}</style>
</head>
<body>
<div class="container">

<header>
  <div class="eyebrow">FATBOY · v4 · 8×8 = 64 COMBINATIONS</div>
  <h1>肥仔 · 角色 × 状态 全矩阵</h1>
  <p class="subtitle">
    8 个主题角色 × 8 个情绪状态 = 64 个组合。
    赛车手能击败小怪、宇航员会撒花庆祝、忍者也会撑下巴思考。
    每个角色都有完整的情绪生命周期。
  </p>
</header>

<section>
  <div class="section-title">PART ONE · 完整矩阵</div>
  <h2 class="section-headline">64 个组合一图全见</h2>
  <p class="section-lead">
    横向 8 列：8 个情绪状态。
    纵向 8 行：8 个主题角色。
    每个交叉点是一个独立的 SVG 文件，可直接用于产品。
    鼠标悬停可放大查看细节。
  </p>
  <div class="matrix-wrap">
    {matrix_section()}
  </div>
</section>

<section>
  <div class="section-title">PART TWO · 角色总览</div>
  <h2 class="section-headline">8 个角色，8 种身份</h2>
  <p class="section-lead">儿子可以挑选今天扮演哪个肥仔。每个卡片显示该角色的 default 表情。</p>
  {character_section()}
</section>

<section>
  <div class="section-title">PART THREE · 状态总览</div>
  <h2 class="section-headline">8 个状态，覆盖所有交互</h2>
  <p class="section-lead">以原版肥仔为例展示 8 个表情状态。其他 7 个角色对应表情可见 PART ONE 矩阵。</p>
  {state_section()}
</section>

<section>
  <div class="section-title">PART FOUR · 动画演示</div>
  <h2 class="section-headline">动画跨角色也成立</h2>
  <p class="section-lead">同一段动画可应用到任何角色 × 任何状态的组合，由 <code>autoAnimate</code> 自动匹配。</p>
  <div class="grid">
    {anim_demo_section()}
  </div>
</section>

<section>
  <div class="section-title">PART FIVE · 场景演练</div>
  <h2 class="section-headline">应用集成预览</h2>
  <p class="section-lead">不同时间、不同角色、不同状态在产品中的样子。</p>
  <div class="context-grid">
    {scenes_section()}
  </div>
</section>

<footer>
  <strong>资产清单</strong>：64 个 SVG (8 角色 × 8 状态) · 1 个统一 React 组件 <code>&lt;Fatboy/&gt;</code> · 6 段 CSS 动画。
  <br><br>
  统一用法：<code>&lt;Fatboy character="racer" state="victory" autoAnimate /&gt;</code><br>
  向后兼容：<code>&lt;FatboyAvatar state="..." /&gt;</code> · <code>&lt;FatboyCharacter character="..." /&gt;</code>
  <br><br>
  肥仔大闯关 · v4 · Made with care
</footer>

</div>
</body>
</html>
'''

with open(OUT, 'w', encoding='utf-8') as f:
    f.write(html)

print(f'Wrote {OUT} ({len(html)/1024:.1f}KB)')
