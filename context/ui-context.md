# UI Context

## Theme

Agility Travels uses a "Premium Corporate" aesthetic. It emphasizes whitespace, large border radii (3rem), and sophisticated shadowing. The primary interaction color is Orange, with Emerald used for success and status indicators.

## Colors

| Role            | CSS Variable       | Value    |
| --------------- | ------------------ | -------- |
| Page background | `--bg-white`       | `#ffffff` |
| Surface         | `--bg-slate-50`    | `#f8fafc` |
| Primary text    | `--text-slate-900` | `#0f172a` |
| Muted text      | `--text-slate-400` | `#94a3b8` |
| Primary accent  | `--accent-orange`  | `#f97316` |
| Secondary accent| `--accent-emerald` | `#10b981` |
| Border          | `--border-slate-100`| `#f1f5f9` |

## Typography

| Role      | Font              | Variable      |
| --------- | ----------------- | ------------- |
| UI text   | Inter / Sans      | `--font-sans` |
| Data/Mono | JetBrains Mono    | `--font-mono` |

## Border Radius

| Context           | Class            |
| ----------------- | ---------------- |
| Inline / small UI | `rounded-2xl`    |
| Cards / panels    | `rounded-[2.5rem]` |
| Modals / Hero     | `rounded-[3rem]` |

## Component Library

Custom components built on Tailwind CSS. Uses Lucide React for iconography.

## Layout Patterns

- **Standard Page**: Top navigation, content body with max-width (7xl), bottom footer.
- **Admin Layout**: Dashboard grid with stats cards, revenue charts, and data tables.
- **Booking Modal**: Centered multi-step form with background blur overlay.

## Icons

Lucide React. Stroke width: 2. Sizes: 18-24px depending on context.
