---
name: Nomad Compass
description: A navigator's chart table for nonprofit impact — brass, parchment, and signal teal on deep sea ink.
colors:
  ink: "#0a1a30"
  abyss: "#071322"
  surface: "#0e2038"
  surface2: "#13294a"
  hairline: "#24405f"
  parchment: "#f1e9d6"
  ivory: "#efeadd"
  brass: "#cba85c"
  brassbright: "#e7ce88"
  teal: "#4fc4d3"
  tealdim: "#2f8b98"
  inkmute: "#93a6c2"
  inkfaint: "#7d92b3"
  alert: "#d25a4e"
  alerttext: "#f4c9c2"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(2.1rem, 3.4vw, 3.35rem)"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-0.015em"
    fontFeature: "opsz auto"
  headline:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  metric:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Space Mono, ui-monospace, monospace"
    fontSize: "0.6rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.18em"
rounded:
  cartouche: "4px"
  md: "6px"
  tooltip: "10px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.brass}"
    textColor: "#26200e"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.brassbright}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.parchment}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.parchment}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
  input:
    backgroundColor: "{colors.abyss}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.md}"
    padding: "11px 14px 11px 37px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.parchment}"
    rounded: "{rounded.xl}"
    padding: "32px"
  stat-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.xl}"
    padding: "24px"
  chip-teal:
    backgroundColor: "rgba(79, 196, 211, 0.10)"
    textColor: "{colors.teal}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  chip-brass:
    backgroundColor: "rgba(203, 168, 92, 0.10)"
    textColor: "{colors.brass}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.inkmute}"
    rounded: "{rounded.lg}"
    padding: "12px"
  nav-item-active:
    backgroundColor: "rgba(79, 196, 211, 0.10)"
    textColor: "{colors.ivory}"
    rounded: "{rounded.lg}"
    padding: "12px"
---

# Design System: Nomad Compass

## Overview

**Creative North Star: "The Chart Table"**

A navigator's chart table at night. The ground is deep sea ink, unlit except where it matters. Charts are drawn in parchment; the instruments on top of them are brass; the one live reading — the needle, the signal, the thing currently true — is teal. Beneath everything runs a faint graticule, the surveyor's grid that says every position here was plotted, not guessed.

The character is **warm and expeditionary**. This is not a compliance console. The person using it is on a long journey with a real destination, and the surfaces they touch — parchment text, brass edges, the lamplit warmth of the accent — should feel like equipment that has been carried somewhere, not software that was provisioned. The warmth lives in the surround: the paper-toned type, the brass hairlines, the glow under a primary action. The data itself stays sober. Warm frame, precise readout — that tension is the whole system, and collapsing either side breaks it. Decorate the instrument, never the measurement.

Controls are **tactile and confident**. Brass buttons carry a real gradient and a warm glow, they compress on press, inputs answer focus with a teal ring. Nothing here is a flat rectangle waiting to be told it was clicked.

**Key Characteristics:**
- Dark ground always; parchment is the ink, never the paper
- Two accents with jobs: teal reads *impact*, brass reads *money, governance, and action*
- Three typefaces with strict roles: Fraunces states, Inter explains, Space Mono labels
- Flat surfaces separated by 1px hairlines — depth by line, not by shadow
- A fixed 72px graticule behind the entire application
- Brass corner ticks and inset double hairlines mark a surface as a document of record

## Colors

A cartographic instrument palette: cold deep ground, warm metal, and a single cool signal — the warmth of paper and brass against the cold of deep water.

### Primary
- **Signal Teal** (`#4fc4d3`): The live reading. Impact metrics, outcome values, positive trend, online state, focus rings, active navigation, and the primary chart series. This is what is currently, verifiably true.
- **Deep Teal** (`#2f8b98`): The dimmed companion for stacked chart segments and secondary series where full-strength teal would flatten the hierarchy.

### Secondary
- **Lamplit Brass** (`#cba85c`): Money, governance, quality, and calls to action. Primary buttons, funding charts, section eyebrows, the graticule itself, hover borders, and every corner tick. Brass is the metal on the table — the human, decision-making layer.
- **Bright Brass** (`#e7ce88`): The lit face of brass. Top stop of every primary-button gradient, hover state for brass text, and emphasis inside display type (the italic in a headline).

### Neutral
- **Sea Ink** (`#0a1a30`): The application ground. The base every screen sits on.
- **Abyss** (`#071322`): Deeper than ground. The sidebar, sticky header, inset wells inside cards, and input fields — recessed things.
- **Chart Surface** (`#0e2038`): The card plane. Every panel, card, and container.
- **Raised Surface** (`#13294a`): Hover state for surfaces, avatar fills, and controls that need to sit above the card plane.
- **Hairline** (`#24405f`): The separator. Every border, divider, rule, and chart gridline in the system.
- **Chart Parchment** (`#f1e9d6`): Primary body text. Warm, paper-toned, never pure white.
- **Ivory** (`#efeadd`): Reserved for headings and metric values — a half-step brighter than parchment so numbers lift off their labels without resorting to white.
- **Muted Ink** (`#93a6c2`): Secondary text, descriptions, axis ticks, chart legends.
- **Faint Ink** (`#7d92b3`): Labels, placeholders, inactive icons, and the smallest supporting text. Tuned to clear 4.5:1 contrast against every surface it sits on (Chart Surface, Abyss, Sea Ink) — this is the system's smallest, most frequent text, so it carries the accessibility floor rather than trading below it for extra fade.

### Status
Two accents carry most state, and one red exists for the case they cannot cover.
- **On track / verified / live:** Signal Teal. Target met, data verified, online, positive trend.
- **Needs attention:** Lamplit Brass. Below target, pending, offline, demo mode, and anything awaiting a decision.
- **Alert** (`#d25a4e`, with **Alert Text** `#f4c9c2`): the only red in the system. Errors and data-quality failures only — never a decorative or "urgent marketing" red. It appears as a 12–15% wash inside a 32–40% border with Alert Text on top, matching the sign-in error well.

### Chart Ramps
Charts draw from the same two accents rather than a separate categorical palette. Impact and outcome series use the teal ramp (`#4fc4d3` → `#6fd2de` → `#9ae0e8` → `#c4eef2`); funding, spend, and source series use the brass ramp (`#cba85c` → `#e7ce88` → `#b8905a` → `#8a6d3f`); demographic and neutral categorical series use the slate ramp (`#6f86a6` → `#93a6c2` → `#b7c4d8` → `#d8e0ec`).

### Named Rules

**The Two Bearings Rule.** Teal means impact; brass means money, governance, and action. Follow it by default so a returning user can read a screen by color before reading a word. Deviate only when a specific composition genuinely needs it — and never mix both accents into a single metric's treatment, which is what makes the code unreadable.

**The Dark Ground Rule.** There is no light mode. Parchment is the ink and sea ink is the paper. A white or near-white background anywhere in the product breaks the world outright.

**The Rare Signal Rule.** Full-strength teal covers a small fraction of any screen — it is the needle, not the sea. When more than a few elements glow teal at once, nothing reads as the live value anymore.

## Typography

**Display Font:** Fraunces (with Georgia, serif) — variable optical sizing enabled
**Body Font:** Inter (with ui-sans-serif, system-ui)
**Label/Mono Font:** Space Mono (with ui-monospace, monospace)

**Character:** Fraunces is a warm, high-contrast serif with real optical sizing — it gives headings and numbers the authority of something printed rather than rendered. Inter carries explanation invisibly. Space Mono, always uppercase and widely tracked, is the engraved brass plate on the instrument: every label, unit, eyebrow, timestamp, and axis reads as if it were etched rather than typed. The three never trade jobs.

### Hierarchy
- **Display** (Fraunces 600, `clamp(2.1rem, 3.4vw, 3.35rem)`, line-height 1.04, tracking -0.015em): Entry moments only — the sign-in headline and the trial page. Italic inside display type is set in Bright Brass.
- **Headline** (Fraunces 600, 2.25rem, line-height 1.1, tracking -0.01em): The page title on a dashboard view.
- **Title** (Fraunces 600, 1.125rem): Card and panel headings.
- **Metric** (Fraunces 600, 1.875rem, tracking -0.025em, Ivory): The number itself — stat values, KPI readouts, chart centers. This is the role the whole product exists to serve; it never falls back to the body font.
- **Body** (Inter 400, 0.875rem, line-height 1.6, Parchment): Descriptions, help text, and paragraph copy. Cap measure at 65–75ch.
- **Label** (Space Mono 400/700, 0.6rem, tracking 0.18em, uppercase, Faint Ink): Field labels, eyebrows, units, section markers, chart axis names, and status text.

### Named Rules

**The Three Voices Rule.** Fraunces states, Inter explains, Space Mono labels. A number is never set in Inter. A paragraph is never set in Space Mono. A field label is never set in anything but Space Mono.

**The Engraved Label Rule.** Every Space Mono label is uppercase with at least 0.16em tracking. Tight or sentence-case mono reads as code, not as an instrument face.

**The Ivory Peak Rule.** Ivory is the brightest text in the system and belongs only to headings and metric values. Body copy sits one step down in Parchment. Nothing is pure white.

## Layout

The application is a fixed two-part shell: a persistent left sidebar that collapses between 256px and 80px on a 300ms ease-in-out transition, and a main column with a 80px sticky header carrying an `abyss/85` backdrop blur. Content sits in a `max-width: 80rem` centered container with 32px padding and 32px vertical rhythm between sections.

Dashboards use a 3-column grid at desktop: two columns of paired chart cards and a third column holding a sticky KPI rail that pins 96px from the top. Chart cards pair two-up inside their span and collapse to one-up below the medium breakpoint. Stat cards run three-up and stack. The sign-in is the exception — a `1.15fr / 0.85fr` split of hero and cartouche that becomes a single stacked column below 900px, where the compass moves to the top at 150px and the bearing readout is dropped entirely rather than compressed.

Internal spacing runs on a 4px base: 24px padding for stat and rail cards, 32px for chart panels, 32px between grid children, 20–32px between a card's header and its content.

**The Graticule Rule.** A 72px grid of 1px brass lines at 6% opacity is fixed behind the entire application (68px and masked to a soft radial falloff on the sign-in). It is `position: fixed`, non-interactive, and sits at z-index 0 with all content lifted to z-index 1. It never scrolls with content — the chart stays still while the data moves across it.

## Elevation & Depth

**This system is flat.** Surfaces do not float. Separation is done with a single 1px Hairline (`#24405f`) rule and, where more distinction is needed, a half-step of tonal difference between Abyss, Sea Ink, Chart Surface, and Raised Surface. A card at rest has a border and no shadow.

Shadow is reserved for two jobs only: an object that has genuinely left the plane (the sign-in cartouche, modals, the sidebar's edge), and the warm halo beneath a brass primary button that makes it read as lit metal rather than a colored rectangle.

### Shadow Vocabulary
- **Cartouche lift** (`box-shadow: 0 40px 90px -40px rgba(0,0,0,0.8)`): The sign-in panel and the trial card — a deep, soft, almost invisible drop that lifts a document off the table.
- **Brass glow** (`box-shadow: 0 12px 30px -14px rgba(203,168,92,0.55)`): Under primary buttons at rest, deepening to `0 16px 36px -14px rgba(203,168,92,0.7)` on hover.
- **Chart tooltip** (`box-shadow: 0 18px 40px -18px rgba(0,0,0,0.7)`): The dark Recharts tooltip, paired with a hairline border and 10px radius.

### Named Rules

**The Hairline Rule.** Separation is a line, not a shadow. If two surfaces need distinguishing, give them a 1px Hairline border or a tonal step — never a drop shadow. Reaching for shadow to solve a boundary is the single fastest way to turn this into a generic dashboard.

**The Hover Warms Rule.** Cards do not lift, scale, or shadow on hover. Their border warms from Hairline toward brass at 30–45% opacity over 300ms. That is the entire hover vocabulary for a surface.

## Shapes

Corner language is deliberately split by what a thing *is*. Working surfaces are softly rounded: 12px for cards and panels, 8px for buttons and navigation items, 6px for inputs and small badges, full-round for status pills and metric chips.

Documents of record are sharper. The sign-in cartouche and the trial card sit at 4px — near-square, because a chart cartouche is a printed frame, not a UI card — and carry an inset double hairline 7px in from the edge plus four 12px brass corner ticks. Icons are Lucide at 1.5–2.5px stroke, sized 14px for inline, 16–20px for controls, and 20px for section headings.

The brand mark is a drawn compass rose: concentric arcs, cardinal letters, a gridded inner globe, and triangular pointers, stroked in a single color and rotating 12° on hover. On the sign-in it appears at up to 430px, bleeding 70px off the panel edge, with the needle settling through a damped rotation on load.

**The Cartouche Rule.** Brass corner ticks plus an inset double hairline mark a surface as a document of record. Reserve them for authority and entry moments — sign-in, the trial invitation, a generated report — and never apply them to routine cards. Their meaning comes entirely from their scarcity.

**The Accent Rule Rule.** A stat card's category is declared by a 2px full-height accent bar on its left edge at 85% opacity, teal or brass per the Two Bearings Rule. It is the cheapest categorical signal in the system and should be reached for before adding a colored background.

## Components

### Buttons
- **Shape:** Gently rounded (8px), 7px on the sign-in surface.
- **Primary:** A vertical brass gradient (`#e7ce88` → `#cba85c`) with near-black brass-tinted text (`#26200e`), 600–700 weight, plus the brass glow shadow. The dark text on lit metal is what makes it read as an instrument key rather than a web button.
- **Hover / Focus:** `filter: brightness(1.05)` and a deeper glow; `:active` compresses to `scale(0.98)`. Transitions run 120–200ms. Keyboard focus is a 2px brass outline at 2px offset.
- **Secondary:** Chart Surface fill with a Hairline border, warming to a brass border and Raised Surface fill on hover.
- **Ghost:** Transparent with a muted-ink border at 28% opacity; hover brings a brass border over a 6% brass wash.

### Cards / Containers
- **Corner Style:** 12px (`rounded-xl`).
- **Background:** Chart Surface; inset wells inside a card drop to Sea Ink at 60%.
- **Shadow Strategy:** None. See Elevation.
- **Border:** 1px Hairline, warming to brass 30–45% on hover over 300ms.
- **Internal Padding:** 32px for chart panels, 24px for stat and rail cards.

### Inputs / Fields
- **Style:** Recessed — Abyss at 60–70% fill inside a muted-ink border at 20%, 6–7px radius, 11px vertical padding, with a leading icon inset 12px.
- **Focus:** Border shifts to teal and a 3px teal ring at 16% opacity appears; the leading icon turns teal at the same moment. Nothing moves.
- **Label:** Space Mono, uppercase, 0.58–0.6rem, 0.2em tracking, Faint Ink, 6px above the field.
- **Error:** An Alert-tinted well (12% fill, 32% border) with an alert icon and 0.76rem text in Alert Text. Errors sit above the form, never as a bare red border.

### Navigation
- **Style:** Full-width 12px-padded rows at 8px radius, Muted Ink label with a Faint Ink icon.
- **Active:** A 10% teal wash inside a 25% teal border, Ivory label, teal icon, plus a 2px brass tab pinned to the left edge — the only place both accents legitimately meet on one element.
- **Hover:** A 5% white wash and Parchment text.
- **Collapsed:** At 80px the labels disappear and alert dots move onto the icons themselves.
- **Section markers:** Grouping labels ("Preview Features") are Space Mono, 10px, 0.2em tracking, Faint Ink.

### Status Pills
Full-round, 10–11px Space Mono uppercase, built as a 10% accent wash inside a 25% accent border with accent text. Teal for online, verified, and positive trend; brass for offline, demo mode, and governance flags. A pulsing 6px dot precedes live states.

### Stat Card (signature)
The defining component. A 24px card carrying its left accent bar, an icon in a tinted square (accent at 9% fill, 25% border), a trend pill top-right, a Space Mono label, an Ivory metric value with an optional muted sub-unit, a one-line description, and a sparkline bleeding into the bottom 56px at 40% opacity — rising to 70% on hover. The sparkline is chrome, not data: no axes, no labels, drawn in the card's own accent.

### Cartouche (signature)
The framed panel used for entry and authority moments: 4px radius, a gradient from Chart Surface to `#0b1b31`, a brass-tinted border, an inset double hairline at 7px, four brass corner ticks, and the cartouche lift shadow. Contents lead with a Space Mono brass eyebrow, then a Fraunces display title.

## Do's and Don'ts

### Do:
- **Do** keep the ground dark and text warm. Parchment (`#f1e9d6`) for body, Ivory (`#efeadd`) for headings and numbers.
- **Do** separate surfaces with a 1px Hairline (`#24405f`) and warm that border on hover instead of adding a shadow.
- **Do** set every label, unit, eyebrow, and axis in Space Mono, uppercase, ≥0.16em tracking.
- **Do** set every metric value in Fraunces at 600 with tight tracking — the number is the product.
- **Do** follow the Two Bearings Rule by default: teal for impact and live state, brass for money, governance, and action.
- **Do** draw charts from the teal and brass ramps so a chart reads as part of the instrument rather than a library default.
- **Do** honor `prefers-reduced-motion` — the sign-in already disables the compass settle and every rise animation under it.
- **Do** give inputs a teal focus ring (3px at 16%) and buttons a 2px brass focus outline. Both already exist; match them.
- **Do** mark sample and demo data unmistakably. The brass Demo Mode treatment exists for this reason and PRODUCT.md forbids passing sample figures off as real.

### Don't:
- **Don't** introduce a light background, a white card, or `bg-white` anywhere. There are currently ~22 `bg-white` usages in the codebase; they are drift, not precedent, and should be migrated to Chart Surface or Abyss.
- **Don't** use the legacy `brand-50` through `brand-900` scale in `index.css`. It predates the cartographic palette and is referenced by nothing — treat it as deprecated and remove it rather than reviving it.
- **Don't** use Tailwind's `slate-*` or `gray-*` families. The system has its own neutrals: Muted Ink and Faint Ink. The remaining `text-slate-*` usages in `BrandLogo.tsx` are the last holdouts of the pre-cartographic identity.
- **Don't** trust the chart color keys in `App.tsx` — `COLORS.purple` and `COLORS.orange` hold brass values and `COLORS.blue` holds teal. Read the values, not the names, and prefer renaming them to `impact` / `funding` / `neutral`.
- **Don't** add drop shadows to cards, or scale/lift them on hover.
- **Don't** apply corner ticks or the cartouche frame to ordinary cards. They mean "document of record" and lose that meaning through repetition.
- **Don't** let full-strength teal spread across a screen. If several things glow at once, none of them is the live reading.
- **Don't** ship Recharts' default light tooltip. The dark tooltip override in `index.css` is part of the world; a white tooltip tears a hole in it.
- **Don't** set a paragraph in Space Mono or a metric in Inter.
