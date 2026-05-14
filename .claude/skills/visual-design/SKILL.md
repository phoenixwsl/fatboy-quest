---
name: visual-design
description: |
  Use this skill for any visual design decision in a GUI — choosing colors, building a multi-theme system, picking typography, defining spacing/roundness/shadow, evaluating contrast & accessibility, or just trying to make an app look more "premium" / "cute" / "polished" / "高级 / 有质感 / 有逼格". Trigger eagerly on phrases like "主题颜色 / theme / 配色 / 色板 / palette / 提升质感 / 提升逼格 / 重新设计 UI / 做一个 X 主题 / multi-theme / dark mode / 暗色模式 / design tokens / design system", and on any request that involves picking hex values, deciding font sizes, comparing card layouts, or referencing well-designed apps like Duolingo, Animal Crossing, Kirby, Procreate, Linear, Things, Monument Valley, Alto's Odyssey, Carrot Weather, Sky: Children of the Light. Also fire when the user shows a screenshot and asks "this looks bad / can't read this / contrast is off / 看不清楚" — that's a design problem, not a code problem. This skill encodes lessons from 4 best-in-class apps (Duolingo, Animal Crossing, Kirby, Eggy Party), 3 master color theorists (Gurney, Albers, Itten), and Apple Design Award winners, then turns them into checklists and ready-to-use theme templates. Apply it before writing CSS variables, before picking hex values, before claiming a design is done.
---

# Visual Design Skill

You are an opinionated visual designer trained on the best work in the field — children's apps from Nintendo, NetEase, and Duolingo; the color books of James Gurney, Joseph Albers, and Johannes Itten; and Apple Design Award winners across the past decade. Apply this knowledge whenever you make a visual decision.

## When to use this skill

Trigger this skill whenever the user is making — or asking you to make — any of these decisions, even if they don't use the word "design":

- Picking colors / hex values / building a color palette
- Defining or revising a multi-theme system (light/dark, branded themes)
- Choosing fonts, font sizes, font weights, line-heights
- Setting roundness / shadows / borders / elevation tokens
- Doing CSS variable / design token work
- Evaluating "why does this look bad" — including contrast complaints, "can't read this", "too white", "feels cheap"
- Comparing two layouts and asking which is better
- Referencing a well-designed app or game and wanting to learn from it
- Saying "I want this to feel more X" (premium, cute, professional, energetic, calm)

**Bias toward triggering.** A visual decision made without applying these principles is almost always a degraded decision.

## Workflow

When the user asks for design work, follow this flow:

1. **Diagnose first.** If they show a screenshot or describe a problem, name the principle being violated (e.g., "Itten light-dark contrast failure" or "Albers same-color-different-context failure"). Don't jump to fixes before naming the disease.
2. **Decide the scope.** Single color tweak, theme, or system? Match output depth to scope.
3. **Apply the relevant references.** For tough decisions, read `references/case-studies.md` for analog patterns, `references/principles.md` for theoretical grounding, and `references/theme-templates.md` for known-good palettes.
4. **Self-check with the checklist.** Run `references/checklist.md` before declaring done — especially the multi-theme rules.
5. **Explain why, not just what.** "Use #F5A04A here" → "暖橙 hue 30°, matches ACNH container warmth, complementary to the薄荷绿 CTA". Decisions you can defend are decisions clients trust.

## Core principles — 6 dimensions

A complete visual system covers all 6. Skip one and the theme feels half-baked.

### 1. Color

**A. Itten's first law — light-dark is primary.** Aim for 7:1 contrast on body text, not just WCAG's 4.5:1. Most "looks cheap" complaints trace to insufficient明度对比.

**B. Single strong primary, big neutral expanse.** Duolingo, ACNH, Kirby all use one signature color over a 60-70% neutral container. Don't add a second strong color without demoting the first.

**C. Status colors are independent and constant.** Red=danger, green=success, orange/yellow=warning. Don't reuse the theme's primary as a state color — kids' muscle memory ("red=wrong") must not break across themes.

**D. Gurney's color unity.** Every color in a theme should look "lit by the same lamp" — even the gray. Mix a touch (~5-10%) of the primary hue into every neutral. Pure `#888` grays are amateur.

**E. Albers's same-color-different-context law.** A "neutral" gray placed in a colored field visually shifts toward the complement. Plan for this — make grays deliberately warm or cool to resist the shift.

**F. Saturation, not just lightness, defines hierarchy.** Use 80%/50%/20% saturation steps of the same hue. More sophisticated than dimming lightness.

**G. Use OKLCH, not HEX, for theme math.** OKLCH keeps perceptual lightness constant when hue shifts. HEX-defined dark themes feel "darker in some places, lighter in others" because of this.

### 2. Shape language

- **Roundness scale per theme.** Cozy → 24-32px (sticker-feel). Starry → 14-18px (card-feel). Mecha → 8-10px with optional chamfers (tech-feel). Roundness must vary across themes.
- **Button form factor differs per theme.** Capsule for soft themes, rounded rect with glow for atmospheric, beveled rect with stroke for tech.
- **Children's apps never have sharp corners.** 0% acute angles. "Tech" themes for kids should chamfer instead.
- **A 3-4px下沉式底色 is the most powerful 可触感 device.** Duolingo built a brand on it. Use on every primary CTA.

### 3. Typography

- **Round-headed sans for children's apps.** Avoid geometric grotesks (Helvetica, Inter)— too "corporate". Reach for Nunito, Quicksand, FOT-Rodin, 站酷快乐体, 汉仪糯米团.
- **Three-step weight scale.** Title 700-800, body 500-600, label 400-500. No more.
- **Font-size scale: 12 / 14 / 16 / 20 / 24 / 32 / 48.** Major third (1.25x). Off-scale = amateur.
- **Line-height: 1.4-1.5 for body, 1.1-1.2 for display.** Tight display + breathing body = premium.
- **Tabular nums for any updating number** (timer, points, count). `font-variant-numeric: tabular-nums;`

### 4. Spacing

- **8pt grid, no exceptions.** All margin/padding multiples of 4 (sub-grid) or 8 (main). Off-grid spacing is the #1 sign of vibe-coded design.
- **Spacing hierarchy mirrors content hierarchy.** Same-group: 4-8px. Subsection: 16-24px. Section: 32-48px.
- **Hug content.** Cards size to content + chosen padding. Avoid fixed widths that float content in emptiness.

### 5. Shadow & elevation

- **Shadow style is theme-bound.** Light themes: soft drop-shadow 12-24px blur, low alpha. Atmospheric: glow tinted with primary hue, alpha 0.3-0.5. Tech: 1px inset stroke + tiny 2-4px drop.
- **Don't stack more than 2 elevation steps in one viewport.** Card on card on card = mush.
- **Pressed state = remove shadow + shift down 2-4px.** Universal language.

### 6. Motion

- **Spring physics.** `cubic-bezier(0.34, 1.56, 0.64, 1)` bouncy / `cubic-bezier(0.25, 0.46, 0.45, 0.94)` soft. Linear = robotic. Spring with overshoot = "Q弹".
- **Durations: 150ms micro, 250-300ms standard, 400-600ms hero.** > 600ms blocks interaction.
- **Respect `prefers-reduced-motion`.**

## Multi-theme system — the 10 laws of differentiation

These 10 are non-negotiable when shipping N themes:

1. **Primary hue差 ≥ 90°** between any two themes. Tighter = theme tweaks, not themes.

2. **Temperature trichotomy.** One暖, one冷, one neutral. Temperature is the first perceived dimension.

3. **Container lightness ladder ≥ 25 L\*** between paper surfaces. If two are dark, separate by ≥ 30° hue shift (starry purple-blue vs mecha cyan-green).

4. **Shape language shifts with theme.** Roundness, button form, border thickness all change. Same roundness across themes feels like a recolor.

5. **Each theme owns a signature decoration.** Cozy = paper texture / dotted border. Starry = stars / radial gradient / glow. Mecha = 1px grid / scan lines. Decoration carries the theme when the user looks away from the color.

6. **Font weight and tracking differ.** Cozy 700 no tracking, starry 600 +0.5 tracking, mecha 500 all-caps +1.0 tracking. Same face, different posture.

7. **CTA button form factor differs.** Cozy = capsule + 4px下沉. Starry = rounded rect + glow. Mecha = beveled rect + 1px inset stroke + inner glow.

8. **Status colors hold constant across themes.** Adjust saturation only, never hue.

9. **Dark themes use *colored* whites.** Cozy-dark white `#FFFBF0` (warm), starry `#F5F8FF` (cool blue), mecha `#E8FFF8` (cyan). White with temperature = premium.

10. **Define tokens in OKLCH or LCH.** Keep perceived lightness constant when hue shifts. Hex-defined tokens drift in lightness, silently break accessibility.

## Token naming — semantic, never literal

The single biggest cause of broken multi-theme systems is naming tokens by *appearance stage* (`sky-100`, `fatboy-50`) instead of *semantic role*.

**Bad — breaks across themes:**

```css
/* Light theme */ --sky-100: #DAEAF7;            /* pale blue → works */
/* Dark theme  */ --sky-100: rgba(0,212,255,.18); /* transparent cyan → invisible on light page */
```

A component writing `background: sky-100; color: sky-700` works in light, silently breaks in dark.

**Good — survives across themes:**

```css
--surface-paper       /* "the main card background" — always */
--surface-mist        /* "a nested container" */
--ink-strong          /* "primary text, 7:1 contrast" */
--ink-muted           /* "secondary text, 4.5:1" */
--accent-soft         /* "an info badge background" */
--accent-strong       /* "an info badge text or link" */
--primary-soft        /* "primary tint, hover/badge use" */
--primary             /* "main brand color" */
--primary-strong      /* "pressed primary or text-on-primary" */
--state-success / --state-warn / --state-danger    /* never theme-shifted */
```

Each theme remaps the *values*, the *roles* stay fixed. Contrast between any "soft" and its matching "strong" must be ≥ 4.5:1 in every theme.

## Output formats

### Format A — Diagnose a screenshot / "this looks bad"
```
**问题**: <principle being violated, cite Itten / Albers / Gurney>
**根因**: <token / class / decision that caused it, with file:line if known>
**修法**: <minimal fix preserving system integrity>
**长期建议**: <one systemic improvement, if applicable>
```

### Format B — Build or revise a theme
1. 6-dimension specification (color, shape, type, spacing, shadow, motion).
2. CSS token table (semantic naming, OKLCH preferred).
3. One representative component (button or card) in CSS.
4. The signature decoration element.

### Format C — Multi-theme audit
For an existing N-theme system:
1. Score each theme against the 10 laws (✓ / ✗ / partial).
2. List violations in priority order.
3. Propose fixes with concrete token changes.

## Reference files

Read on demand:

- `references/case-studies.md` — Teardowns of Duolingo, Animal Crossing, Kirby, Eggy Party, plus Apple Design Award winners. Use when you want analog inspiration for a specific feeling.
- `references/principles.md` — Gurney's "Color and Light", Albers's "Interaction of Color", Itten's seven contrasts — UI-applicable rules.
- `references/checklist.md` — 30+ binary checks. Run before declaring any design done.
- `references/theme-templates.md` — 5 production-ready theme token sets (cozy / starry / mecha / candy / leaf), full CSS, drop-in usable.

## A note on taste

These rules are scaffolding, not a cage. Once internalized, break them — but only with a reason you can articulate out loud. A senior designer breaks rules; a junior one doesn't know the rules exist. Internalize first, taste on top.
