import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { SortConfig } from "./Table";

// ============= Icons =============

const FilterIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="currentColor"
  >
    <path d="M1 2h10L7 6.5V11L5 9.5V6.5L1 2z" />
  </svg>
);

const SortAscIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="currentColor"
  >
    <path d="M6 2L2 7h8L6 2z" />
  </svg>
);

const SortDescIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="currentColor"
  >
    <path d="M6 10l4-5H2l4 5z" />
  </svg>
);

// ============= Types =============

export interface ColumnFilterProps {
  columnKey: string;
  label: string;
  distinctValues: string[];
  search: string;
  excluded: Set<string>;
  sortConfig: SortConfig | null;
  isSortable?: boolean;
  onSort: (direction: "asc" | "desc") => void;
  onSearchChange: (value: string) => void;
  onExcludedChange: (next: Set<string>) => void;
  onClear: () => void;
  /** Clear the filters on every column, not just this one. */
  onClearAll: () => void;
  /** Whether any column (this or another) currently has an active filter. */
  anyFilterActive: boolean;
}

// ============= Component =============

const POPOVER_WIDTH = 240;

const ColumnFilter: React.FC<ColumnFilterProps> = ({
  columnKey,
  label,
  distinctValues,
  search,
  excluded,
  sortConfig,
  isSortable = true,
  onSort,
  onSearchChange,
  onExcludedChange,
  onClear,
  onClearAll,
  anyFilterActive,
}) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const masterRef = useRef<HTMLInputElement>(null);

  const isActive = search.trim() !== "" || excluded.size > 0;
  const sortDir = sortConfig && sortConfig.key === columnKey ? sortConfig.direction : null;

  const visibleValues = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return distinctValues;
    return distinctValues.filter((v) => v.toLowerCase().includes(q));
  }, [distinctValues, search]);

  const allVisibleSelected =
    visibleValues.length > 0 && visibleValues.every((v) => !excluded.has(v));
  const someVisibleSelected = visibleValues.some((v) => !excluded.has(v));

  // Position the popover under the button, clamped to the viewport.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    let left = rect.right - POPOVER_WIDTH;
    const maxLeft = window.innerWidth - POPOVER_WIDTH - 8;
    if (left > maxLeft) left = maxLeft;
    if (left < 8) left = 8;
    setPos({ top: rect.bottom + 6, left });
  }, [open]);

  // Reflect indeterminate state on the master checkbox.
  useEffect(() => {
    if (masterRef.current) {
      masterRef.current.indeterminate = someVisibleSelected && !allVisibleSelected;
    }
  }, [someVisibleSelected, allVisibleSelected, open]);

  // Close on outside click, Escape, or scroll.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    // Close when the whole page scrolls or the window resizes (the popover is
    // position:fixed and won't follow). Ignore scrolls that originate inside the
    // popover's own value list AND scrolls fired by an inner scroll container —
    // e.g. the table body clamping its scrollTop when "select all" filters rows
    // out. Otherwise the master checkbox would dismiss its own menu.
    const onScroll = (e: Event) => {
      const target = e.target as Node | Window | null;
      if (
        target &&
        target instanceof Node &&
        popoverRef.current &&
        popoverRef.current.contains(target)
      ) {
        return;
      }
      const isPageScroll =
        target === window ||
        target === document ||
        target === document.documentElement ||
        target === document.body;
      if (!isPageScroll) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  const toggleValue = (value: string) => {
    const next = new Set(excluded);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onExcludedChange(next);
  };

  const toggleAllVisible = () => {
    const next = new Set(excluded);
    if (allVisibleSelected) {
      visibleValues.forEach((v) => next.add(v));
    } else {
      visibleValues.forEach((v) => next.delete(v));
    }
    onExcludedChange(next);
  };

  const handleClear = () => {
    onClear();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`apt-filter-btn ${isActive ? "apt-filter-btn-active" : ""}`}
        aria-label={`Filter ${label}`}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <FilterIcon className="apt-filter-icon" />
      </button>

      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            className="apt-filter-popover"
            style={{ top: pos.top, left: pos.left, width: POPOVER_WIDTH }}
            onClick={(e) => e.stopPropagation()}
          >
            {isSortable && (
              <div className="apt-filter-sort-row">
                <button
                  type="button"
                  className={`apt-filter-sort-btn ${
                    sortDir === "asc" ? "apt-filter-sort-btn-active" : ""
                  }`}
                  onClick={() => onSort("asc")}
                >
                  <SortAscIcon className="apt-filter-sort-icon" />
                  <span>Asc</span>
                </button>
                <button
                  type="button"
                  className={`apt-filter-sort-btn ${
                    sortDir === "desc" ? "apt-filter-sort-btn-active" : ""
                  }`}
                  onClick={() => onSort("desc")}
                >
                  <SortDescIcon className="apt-filter-sort-icon" />
                  <span>Desc</span>
                </button>
              </div>
            )}

            <div className="apt-filter-search-wrap">
              <input
                type="text"
                className="apt-filter-search"
                placeholder="Search…"
                value={search}
                autoFocus
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>

            <label className="apt-filter-item apt-filter-item-all">
              <input
                ref={masterRef}
                type="checkbox"
                className="apt-filter-checkbox"
                checked={allVisibleSelected}
                onChange={toggleAllVisible}
              />
              <span className="apt-filter-item-label">
                {search.trim() ? "Select all (filtered)" : "Select all"}
              </span>
            </label>

            <div className="apt-filter-list">
              {visibleValues.length === 0 ? (
                <div className="apt-filter-empty">No matches</div>
              ) : (
                visibleValues.map((value) => (
                  <label key={value} className="apt-filter-item">
                    <input
                      type="checkbox"
                      className="apt-filter-checkbox"
                      checked={!excluded.has(value)}
                      onChange={() => toggleValue(value)}
                    />
                    <span className="apt-filter-item-label" title={value}>
                      {value === "" ? "(Blanks)" : value}
                    </span>
                  </label>
                ))
              )}
            </div>

            <div className="apt-filter-footer">
              <div className="apt-filter-footer-left">
                <button
                  type="button"
                  className="apt-filter-clear"
                  onClick={handleClear}
                  disabled={!isActive}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="apt-filter-clear"
                  onClick={onClearAll}
                  disabled={!anyFilterActive}
                >
                  Clear all
                </button>
              </div>
              <button
                type="button"
                className="apt-filter-done"
                onClick={() => setOpen(false)}
              >
                Done
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default ColumnFilter;
