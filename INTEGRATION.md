# 肥仔形象集成指令 · v4

> **这份文档的目标读者是 Claude Code**（或在 Cowork / 终端里运行的 Claude 代理）。
> Frank：直接把这份 markdown 和 `fatboy/` 目录一起丢给 Claude Code，让它按本文档执行。

---

## 0. 给 Claude 的开场说明

你现在要做的事：把 `fatboy/` 资产包集成到肥仔大闯关产品里，替换所有 emoji 头像、接入状态切换、加入角色选择功能。

**开始之前请按这个顺序工作（必须）**：

1. `cat fatboy/README.md` —— 完整阅读资产包说明
2. `ls -R fatboy/svg/characters/` —— 确认所有 64 个 SVG 都在
3. 用 view 看一眼 `fatboy/Fatboy.tsx` 顶部的注释 + 组件 API
4. Explore 当前项目结构：找出 React/Vue/原生 JS、构建工具（Vite/Webpack/无）、状态管理方式、当前首页/闯关页/家长面板的源码位置
5. 在动手集成前，向我（Frank）复述一遍**你计划修改哪些文件、按什么顺序**，等我确认再开始

不要并行多个阶段。一个阶段完成、验收通过、git commit 后再进下一阶段。

---

## 1. 资产包结构（fatboy/）

```
fatboy/
├── svg/characters/
│   ├── default/
│   │   ├── default.svg     │
│   │   ├── thinking.svg    │
│   │   ├── focused.svg     │  这 8 个文件是「原版肥仔」的 8 个表情
│   │   ├── tense.svg       │
│   │   ├── victory.svg     │
│   │   ├── celebrate.svg   │
│   │   ├── resting.svg     │
│   │   └── sleeping.svg    ┘
│   ├── racer/        (8 个状态)   赛车手肥仔
│   ├── astronaut/    (8)          宇航员肥仔
│   ├── pirate/       (8)          海盗船长肥仔
│   ├── ninja/        (8)          忍者肥仔
│   ├── mario/        (8)          水管工肥仔
│   ├── knight/       (8)          骑士肥仔
│   └── wizard/       (8)          魔法师肥仔
├── Fatboy.tsx          # React 统一组件
├── preview.html        # 单文件预览（双击看效果，不是集成产物）
├── generate_all.py     # SVG 生成器（资产源码）
├── build_preview.py    # 预览页构建器
├── AI-PROMPTS.md       # 未来升级用
└── README.md           # 必读
```

**关键事实**：
- `Fatboy.tsx` 是 React + TypeScript 写的，依赖 `import xxx from './svg/.../xxx.svg'`
- SVG 总大小 ~500KB（构建时通常会被树摇 / 转 dataURL）
- 不要修改 `svg/` 下的任何文件 —— 它们是 `generate_all.py` 的产物，下次重新生成会覆盖

---

## 2. 适配技术栈

### 情况 A · 项目是 React + Vite

最常见。`Fatboy.tsx` 可直接用。但 Vite 默认 SVG import 行为是 URL 字符串，无需额外配置。如果项目用了 `vite-plugin-svgr`，要注意：

- 默认 `import x from './a.svg'` 返回 URL ✓ 兼容
- 如果配置了 `?react` 模式，请检查 `vite.config.ts` 的 svgr 配置不要影响 fatboy 目录

### 情况 B · 项目是 React + Create React App / Webpack

`Fatboy.tsx` 的 `import` 语法默认返回 SVG URL。直接可用。

### 情况 C · 项目是 Vue / Svelte

`Fatboy.tsx` 不能直接用。你需要把它**翻译**成项目使用的框架。核心逻辑很简单：

```vue
<!-- Fatboy.vue 等价物 -->
<template>
  <img
    :src="svgUrl"
    :width="size"
    :height="Math.round(size * 320 / 280)"
    :alt="alt"
    :class="['fatboy', `fatboy--${character}`, `fatboy--state-${state}`, animClass]"
    draggable="false"
  />
</template>

<script setup>
import defaultDefault from './svg/characters/default/default.svg';
// ... 总共 64 个 import
const SVG_MATRIX = { default: { default: defaultDefault, ... }, ... };
// ... props 处理同 Fatboy.tsx
</script>
```

### 情况 D · 纯 HTML/JS（无构建工具）

不能用 `import`。改用直接 src 路径：

```html
<img src="/assets/fatboy/default/victory.svg" width="180" height="206" alt="..."/>
```

写一个轻量的 ES module wrapper：

```js
// fatboy.js
export function fatboyUrl(character, state) {
  return `/assets/fatboy/${character}/${state}.svg`;
}
export function renderFatboy(parent, { character='default', state='default', size=180 }) {
  const img = document.createElement('img');
  img.src = fatboyUrl(character, state);
  img.width = size;
  img.height = Math.round(size * 320 / 280);
  parent.appendChild(img);
  return img;
}
```

**遇到不确定的情况，停下来问 Frank 项目用的是什么栈。**

---

## 3. 集成阶段（必须按序）

### 阶段 0 · 准备（30 分钟）

任务清单：
- [ ] 把 `fatboy/` 目录整体复制到项目的 `src/components/` 下（或项目通用资产位置）
- [ ] 修改 `fatboy/Fatboy.tsx` 顶部的 import 路径（如果项目结构需要）
- [ ] 把 `Fatboy.tsx` 文件末尾注释里的 CSS 复制到项目的全局样式表（找 `index.css` / `globals.css` / `App.css`）
- [ ] 写一个最小可用的测试页：临时路由或 dev-only 路由，渲染 `<Fatboy character="racer" state="victory" size={180} autoAnimate />`，确认能正常显示
- [ ] git commit 这一步：`feat(fatboy): add v4 character × state assets`

**验收**：测试页能看到肥仔，没有 console error，构建产物大小合理。

---

### 阶段 1 · 首页头像（最高优先级）

参考截图：首页有 "你好，肥仔 ✨" 标题旁边的笑脸 emoji 头像。

任务清单：
- [ ] 找到首页源文件（可能是 `Home.tsx` / `pages/index.tsx` / `App.tsx` 主路由）
- [ ] 找到所有用 emoji 作为头像的位置
- [ ] 替换为 `<Fatboy />` 组件
- [ ] 用 `inferFatboyState()` 推断当前应该显示什么状态
- [ ] 状态参数支持来自全局 state（如 Zustand / Redux / Context）的 hourOfDay / idleMinutes

代码示例：
```tsx
import { Fatboy, inferFatboyState, CHARACTER_META } from '@/components/fatboy/Fatboy';

function HomePage() {
  const userCharacter = useUserStore(s => s.character) ?? 'default'; // 见阶段 4
  const idleMinutes = useIdleTimer();

  const state = inferFatboyState({
    page: 'home',
    idleMinutes,
    hourOfDay: new Date().getHours(),
  });

  return (
    <header>
      <h1>你好，肥仔 ✨</h1>
      <Fatboy
        character={userCharacter}
        state={state}
        size={120}
        autoAnimate
      />
    </header>
  );
}
```

**验收**：
- [ ] 首页打开看到肥仔，不是 emoji
- [ ] 不滚动就能看到肥仔（首屏 C 位，参见 release plan 的"信息架构颠倒"问题）
- [ ] 早晚不同时间打开，状态会变化（白天 default，夜晚 sleeping）
- [ ] 在儿子的设备上呼吸动画 60fps 流畅
- [ ] git commit: `feat(home): replace emoji avatar with Fatboy v4`

---

### 阶段 2 · 闯关流程（核心 3 屏）

#### 2.1 闯关准备页（"下一只小怪：神机妙算"那一屏）

- [ ] 把左上小肥仔放大到主视觉位置（左侧）
- [ ] 加 `<Fatboy state="focused" size={200} autoAnimate />`
- [ ] 暂不处理"小怪 vs 肥仔的对决构图"（那是 release plan 的 v1.5 任务，先不阻塞）

#### 2.2 倒计时页

- [ ] 顶部小肥仔头像：`<Fatboy state={remainingMinutes < 5 ? 'tense' : 'focused'} size={80} autoAnimate />`
- [ ] 状态根据 `remainingMinutes` 实时更新
- [ ] tense 状态会自动触发 shake 动画，注意确认它不影响倒计时数字的稳定性（应该在独立 layer）

```tsx
const state = remainingMinutes < 5 ? 'tense' : 'focused';
<Fatboy character={userCharacter} state={state} size={80} autoAnimate />
```

#### 2.3 击败页（这是最重要的 3 秒）

参考截图：当前是一个空旷的页面，中央一个闭眼小 emoji，顶部一个绿色"击败！等家长来评分"胶囊。**这一屏是产品高光时刻，必须做好。**

- [ ] 中央换成 `<Fatboy state="victory" size={200} autoAnimate />`
- [ ] **不要** stop in 一个静止 victory ——要播放完整的击败仪式
- [ ] 击败动画时序（参考 release plan v1.3，**简化版**）：
  - 0-0.5s: victory 状态淡入 + bounce 动画
  - 1.5-3s: 切换到 celebrate 状态（短暂庆祝）
  - 3s 之后: 切换到 resting（等家长评分）

简化实现（如果完整动画太复杂，先做这个最小版本）：

```tsx
function VictoryScreen() {
  const [phase, setPhase] = useState<'victory' | 'celebrate' | 'resting'>('victory');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('celebrate'), 1500);
    const t2 = setTimeout(() => setPhase('resting'), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="victory-screen">
      <Fatboy state={phase} size={220} autoAnimate />
      {phase === 'resting' && <div>等家长来评分 ✨</div>}
    </div>
  );
}
```

**验收**：
- [ ] 完成一次作业，确认击败动画播放（不是静止 emoji）
- [ ] 整个过程 3 秒左右，不要超过 5 秒
- [ ] 在儿子的设备上感受一遍，问他"现在感觉爽吗？"
- [ ] git commit: `feat(quest): integrate Fatboy in quest prepare / countdown / victory`

---

### 阶段 3 · 其他页面（家长面板 / 成就馆等）

家长面板顶部那个 🧑‍👩 emoji 可以替换成 `<Fatboy state="default" size={80} />`（无动画，因为家长面板是工作模式）。

成就馆暂时不动 —— 成就 icon 系统是另一个独立资产（release plan 的 v1.2），不属于本次集成范围。

- [ ] 替换家长面板头像
- [ ] 设置页（如果有用户头像）替换
- [ ] git commit: `feat(misc): replace remaining emoji avatars`

---

### 阶段 4 · 角色选择（新功能，可选但强烈推荐）

这是 v4 资产带来的全新能力：让儿子能切换不同的肥仔角色。

任务清单：
- [ ] 在家长面板下新增一个"角色选择"入口（或者直接在儿童端的设置里加，看 Frank 决定）
- [ ] 角色选择页：8 个角色 card 网格
- [ ] 选中状态高亮 + 当前角色显示对勾
- [ ] 用户选择后存到 localStorage / state store
- [ ] 主屏的 Fatboy 自动用该角色

代码：

```tsx
import {
  Fatboy,
  ALL_CHARACTERS,
  CHARACTER_META,
  FatboyCharacterId,
} from '@/components/fatboy/Fatboy';

function CharacterPicker() {
  const [selected, setSelected] = useLocalStorage<FatboyCharacterId>('fatboy-character', 'default');

  return (
    <div className="character-grid">
      {ALL_CHARACTERS.map(id => {
        const meta = CHARACTER_META[id];
        const isSelected = selected === id;
        return (
          <button
            key={id}
            className={`character-card ${isSelected ? 'selected' : ''}`}
            style={{ '--theme': meta.themeColor }}
            onClick={() => setSelected(id)}
          >
            <Fatboy character={id} size={140} bouncing />
            <div className="character-name">{meta.name}</div>
            <div className="character-tag">{meta.tagline}</div>
            {isSelected && <div className="check">✓</div>}
          </button>
        );
      })}
    </div>
  );
}
```

UI 风格参考 `fatboy/preview.html` 的 "PART TWO 角色总览"区域（直接抄那个 CSS）。

**验收**：
- [ ] 8 个角色都能看到
- [ ] 切换后主屏肥仔变了
- [ ] 切换是持久的（刷新后保留）
- [ ] git commit: `feat(character): add character picker (v4 unlock)`

---

## 4. 全局验收清单

集成全部完成时，整个产品应该满足：

- [ ] **全产品没有 emoji 头像**（搜代码确认 `'😀'` / `'😊'` / `'😌'` 等字符串都被替换）
- [ ] **状态自动切换**：首页 default / 闯关 focused / 倒计时末段 tense / 击败 victory→celebrate→resting / 深夜 sleeping
- [ ] **角色持久化**：用户选了赛车手后，所有页面都显示赛车手肥仔
- [ ] **构建产物**：fatboy 资产没让 bundle 暴增到不合理的大小（应该控制在 +600KB 以内，且 gzip 后 +150KB 以内）
- [ ] **性能**：在儿子的设备上，所有动画 60fps 流畅
- [ ] **视觉**：肥仔在所有页面都是 C 位或显眼位置，不是边角小图
- [ ] **儿子的反应**：让他打开 app 玩一下，他自己说出"肥仔现在好玩多了"或类似反馈

---

## 5. 常见问题（FAQ）

### Q1: 项目里没有 svg import 配置，import 报错怎么办？

**Vite**：默认就支持，`import x from './a.svg'` 返回 URL。如果报错，检查 `tsconfig.json` 是否有 `"isolatedModules": true` + 缺少 `vite-env.d.ts` 声明。补一个：
```ts
// vite-env.d.ts
declare module '*.svg' {
  const src: string;
  export default src;
}
```

**Webpack/CRA**：默认支持，应该没问题。

### Q2: 64 个 import 让首屏加载变慢

可以改成动态 import：
```tsx
const Fatboy = lazy(() => import('./Fatboy'));
```
但其实 64 个小 SVG 总共 ~500KB，构建工具会自动 chunk，**正常情况下不需要优化**。先实测再说。

### Q3: 在 PWA 离线模式下 SVG 加载失败

检查 service worker 的 cache 策略，确认 `*.svg` 在缓存白名单里。Workbox 的 `workbox-precaching` 应该自动处理。

### Q4: 击败动画太抢眼，孩子反而不想看

把 `autoAnimate` 关掉，改用静态 victory 状态 + 一个温和的弹入动画。儿子的体感最重要。

### Q5: 想给某个角色加新的状态（比如 angry）

这是 v5 的事，不在本次集成范围。先把 v4 集成完。如果儿子玩了一周后明确需要某个新状态，告诉 Frank，他会回来扩展 `generate_all.py`。

### Q6: Fatboy 显示但 console 有警告 "missing key" 或 "alt"

`alt` 已经有默认值，应该不会缺。`key` 是 React 在 `map` 时的要求，确保给 `<Fatboy />` 加 `key={id}` 即可（参见角色选择代码）。

### Q7: 想自己改某个 SVG 的造型

不要直接改 `svg/` 下的文件，改 `generate_all.py` 然后重跑：
```bash
cd fatboy
python3 generate_all.py
python3 build_preview.py
```
然后 git commit 才会被记下来。

---

## 6. 给 Frank 的工作流建议

集成期间，Frank 可以这样推进：

1. **把这份 INTEGRATION.md + 整个 fatboy/ 目录给 Claude Code**
2. 让 Claude 按文档执行阶段 0
3. 阶段 0 通过后，过一遍编译/本地测试，自己看一眼测试页
4. 让 Claude 继续阶段 1（首页）
5. **阶段 1 完成后，把首页截图发给妻子 / 朋友 / 儿子，收集第一反应**
6. 如果反馈正向，继续阶段 2、3、4
7. 全部完成后，发个朋友圈："这是我给儿子做的礼物"，迎接夸赞

---

## 7. 集成完成后的下一步

按 release plan（`fatboy-quest-release-plan.md`）：

- v1.0「肥仔归位」← **本次集成做的就是这个**
- v1.1「小怪图鉴」（每种作业一个小怪形象）
- v1.2「Icon 系统去 emoji 化」（替换所有非头像的 emoji）
- v1.3「击败仪式」（把 3 秒高光做到完美）
- ……

肥仔形象到位后，整个产品的"灵魂"立起来了，后面的迭代都是顺势打磨。

---

**END · 现在请 Claude 开始按阶段 0 工作。开始前先复述计划，等 Frank 确认。**
