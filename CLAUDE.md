# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`all-purpose-table` is a zero-runtime-dependency React table component published to npm. The entire library is five files in `src/` (`index.ts` barrel, `Table.tsx`, `ColumnFilter.tsx`, `ColumnVisibilityToggle.tsx`, `styles.css`). React/react-dom are peer deps only (react-dom is used for `createPortal`). There is no runtime dependency on `react-icons` — all icons are inline SVG components inside the `.tsx` files.

## Commands

```bash
npm run build      # bundle with tsup -> dist/ (esm + cjs + .d.ts)
npm run dev        # tsup --watch, rebuilds dist/ on change
npm run typecheck  # tsc --noEmit (strict; noUnusedLocals/Parameters enforced)
```

There is **no test runner and no linter** configured. `typecheck` is the only validation gate — run it after changes.

### Running the demo

`demo/` is a separate Vite app with its own `package.json`/`node_modules`. It imports the built library directly (`demo/src/App.jsx` → `../../dist/index.mjs`), so you must **build the library first**, then:

```bash
npm run build                 # from repo root
cd demo && npm install && npm run dev
```

## Build system notes

- `tsup.config.ts` is the real build config: dual ESM/CJS, `dts: true`, `injectStyle: true` (CSS is inlined into the JS bundle, so consumers don't import a separate stylesheet), `external: react/react-dom`.
- **`vite.config.js` at the repo root is stale/unused** — it references `src/index.js` (doesn't exist; entry is `src/index.ts`) and externalizes `react-icons` (no longer a dependency). Don't rely on or extend it; the library builds via tsup only.
- Publishing: `package.json` `files` ships `dist` only; version is bumped manually.

## Architecture

The whole component is `Table.tsx` — a single functional component holding all state; there is no context, reducer, or sub-component split beyond the standalone `ColumnVisibilityToggle`.

**Row normalization (`rows` useMemo in `Table.tsx`)** is the non-obvious core. Incoming `manualRowData` is never rendered directly — each object is mapped to a normalized row that adds:
- `id`: derived by `makeSafeId`, which falls back through a list of domain-specific id fields (`order_id`, `bom_id`, etc.) and finally `-row${idx}`. Used as the React key and for `expandedRowId` matching.
- `#`: 1-based row index (a reserved pseudo-column accessor).
- `_meta`: the original untouched object. `renderFullRow` triggers on `row._meta.fullRow === true`.

Reserved/special accessors: `"#"`, `"details_meta"` (skipped during copy), and `"actions"` (its cells auto-`stopPropagation` so buttons don't fire `onRowClick`).

**Derived-state pipeline:** `rows` → `filteredRows` (column filters) → `sortedRows` (sort) → pagination. Pagination only actually engages when `shouldPaginate && rows > rowsPerPage` (`effectiveShouldPaginate`). `currentPage` is clamped to `safePage` at render time rather than via setState, to avoid setState-during-render.

**Column filtering (`filterable` prop, `ColumnFilter.tsx`):** opt-in Excel-style dropdown per column. Per-column state lives in `columnFilters: Record<accessor, { search, excluded: Set<string> }>` — a row passes if its value substring-matches `search` AND is not in `excluded`. `distinctValuesByColumn` memo builds each column's checklist from the normalized `rows`. `ColumnFilter` renders its popover through `createPortal` to `document.body` (fixed-positioned from the button's rect) so the scroll-area's `overflow:auto` can't clip it; it closes on outside-click/Escape/scroll. Per-column enable resolves as `header.isFilterable ?? filterable`. When a filter empties the result, the header stays rendered (via `noMatches` vs `noData`) so the filter can still be cleared.

**Column resizing (original model — reverted by user request):** `columnWidths` is `Record<accessor, string | number>` (e.g. `"120px"` or a raw number/percentage from `header.width`), applied directly to each `<col>` via `table-layout: fixed; width: 100%`. `handleMouseDown` updates only the dragged column's width (`startWidth = th.offsetWidth` + delta, clamped to `minWidth`/`minColWidth`); every column (including the last) has a resizer. Because the table is `width:100%`, columns without an explicit width share/redistribute the remaining space — this is the intended original behavior. `columnWidthsStorageKey` persists widths to localStorage; `loadStoredColumnWidths` accepts stored strings or numbers. `spanCount` is `headers.length`. (An earlier "frozen columns + spacer" and then "flex last column" model were tried and reverted; don't reintroduce a spacer column or the `columnsFrozen` state.)

**Footer** only renders when there is more than one page, OR when `onRowsPerPageChange` is provided (the rows-per-page selector is gated on that callback existing).

**Column resizing/auto-sizing:** widths live in a `columnWidths` state object keyed by accessor, applied via `<colgroup>`. Drag resize uses document-level mousemove/mouseup listeners and a `suppressHeaderClickRef` one-shot to prevent the drag from also triggering a sort. Optional `columnWidthsStorageKey` persists widths to localStorage. On mobile (`mobileAutoSizeOnHeaderClick`), header click auto-sizes a column to content (measured via a cached canvas 2d context) instead of sorting.

**SSR safety:** all `window`/`document`/`localStorage` access is guarded with `typeof window === "undefined"` checks. Consumers still must render inside a client boundary (Next.js App Router etc.).

## Styling conventions

All CSS classes and variables are prefixed `apt-` to avoid consumer collisions (`styles.css`). Dark mode is driven purely by a `.dark` class on any ancestor (plus `prefers-color-scheme`) — no JS prop, and every theme var must be defined in all four blocks (`:root`, `prefers-color-scheme: dark`, `.dark`, `.light`). Theming is done by overriding `--apt-color-*` CSS variables. Style-toggle props map to modifier classes on the container (`apt-striped`, `apt-dividers`, `apt-bordered`, `apt-compact`), and striping targets `.apt-row-alt` (parity class set in JS, not `:nth-child`, so expanded/full rows don't throw it off). When adding markup, add a matching `apt-`-prefixed class rather than inline styles where an existing pattern fits.

## When changing the public API

`src/index.ts` re-exports both components and their types. Any new prop or exported type must be threaded through the component, the `index.ts` barrel, and the prop/interface tables in `README.md` (the README is the authoritative API reference and is kept in sync by hand).
