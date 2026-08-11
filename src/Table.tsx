import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  CSSProperties,
} from "react";
import ColumnFilter from "./ColumnFilter";

// ============= TypeScript Interfaces =============

export interface TableHeader {
  accessor: string;
  label: string;
  isSortable?: boolean;
  /**
   * Enable the Excel-style filter dropdown for this column. When omitted, the
   * column inherits the table-level `filterable` prop.
   */
  isFilterable?: boolean;
  width?: string | number;
  minWidth?: string | number;
  cellRenderer?: (args: { row: any; value: any }) => React.ReactNode;
}

export interface SortConfig {
  key: string;
  direction: "asc" | "desc";
}

export type TableDensity = "default" | "compact";

interface ColumnFilterState {
  search: string;
  excluded: Set<string>;
}

export interface TableProps {
  manualHeaders: TableHeader[];
  manualRowData: Record<string, any>[];
  initialSort?: SortConfig | null;
  height?: string;
  rowHeight?: number;
  rowsPerPage?: number;
  shouldPaginate?: boolean;
  rowClassName?: (row: any) => string;
  onRowClick?: (row: any) => void;
  minColWidth?: number;
  mobileAutoSizeOnHeaderClick?: boolean;
  mobileBreakpoint?: number;
  columnWidthsStorageKey?: string;
  rowsPerPageOptions?: number[];
  onRowsPerPageChange?: (value: number) => void;
  expandedRowId?: string | null;
  renderExpandedRow?: (row: any) => React.ReactNode;
  renderFullRow?: (row: any) => React.ReactNode;
  /**
   * Called whenever the set of rows currently passing the column filters
   * changes (post-filter, ignoring pagination). Useful for driving a
   * "select all" that should only cover the visible/filtered rows.
   */
  onVisibleRowsChange?: (rows: any[]) => void;
  /** Enable Excel-style per-column filtering on every column (opt-in). */
  filterable?: boolean;
  /**
   * Default column filters applied on mount (and re-applied if the headers /
   * storage key change), keyed by column accessor. Each may set a `search`
   * string and/or a list of distinct cell values to `excluded` (hide). Users
   * can still clear them through the normal filter UI.
   */
  initialColumnFilters?: Record<string, InitialColumnFilter>;
  /** Zebra striping: give every other row a subtle darker background. */
  striped?: boolean;
  /** Draw a horizontal divider line beneath each row. */
  dividers?: boolean;
  /** Draw vertical divider lines between columns (grid look). */
  bordered?: boolean;
  /** Row/cell density. `"compact"` tightens padding for dense data. */
  density?: TableDensity;
}

// ============= SVG Icons =============

const SortIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="currentColor"
  >
    <path d="M6 2L3 5h6L6 2zM6 10l3-3H3l3 3z" />
  </svg>
);

const SortUpIcon: React.FC<{ className?: string }> = ({ className }) => (
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

const SortDownIcon: React.FC<{ className?: string }> = ({ className }) => (
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

// ============= Utilities =============

/** Serializable default filter shape callers pass via `initialColumnFilters`. */
export interface InitialColumnFilter {
  search?: string;
  /** Distinct cell values to exclude (hide) by default for this column. */
  excluded?: string[];
}

/** Normalize the serializable initial filters into internal state (fresh Sets). */
function buildInitialColumnFilters(
  map: Record<string, InitialColumnFilter> | undefined,
): Record<string, ColumnFilterState> {
  const out: Record<string, ColumnFilterState> = {};
  if (map && typeof map === "object") {
    for (const [key, value] of Object.entries(map)) {
      const search = typeof value?.search === "string" ? value.search : "";
      const excluded = new Set(
        Array.isArray(value?.excluded) ? value!.excluded.map(String) : [],
      );
      if (search.trim() !== "" || excluded.size > 0) {
        out[key] = { search, excluded };
      }
    }
  }
  return out;
}

function loadStoredColumnWidths(
  columnWidthsStorageKey: string | undefined,
  fallback: Record<string, string | number | undefined>,
): Record<string, string | number | undefined> {
  if (!columnWidthsStorageKey || typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(columnWidthsStorageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallback;
    const next = { ...fallback };
    Object.keys(next).forEach((key) => {
      const val = parsed[key];
      if (typeof val === "number" || typeof val === "string") next[key] = val;
    });
    return next;
  } catch {
    return fallback;
  }
}

// ============= Main Component =============

const Table: React.FC<TableProps> = ({
  manualHeaders,
  manualRowData,
  initialSort,
  height = "100%",
  rowHeight = 40,
  rowsPerPage = 60,
  shouldPaginate = true,
  rowClassName,
  onRowClick,
  minColWidth = 50,
  mobileAutoSizeOnHeaderClick = false,
  mobileBreakpoint = 768,
  columnWidthsStorageKey,
  rowsPerPageOptions = [20, 50, 100],
  onRowsPerPageChange,
  expandedRowId,
  renderExpandedRow,
  renderFullRow,
  onVisibleRowsChange,
  filterable = false,
  initialColumnFilters,
  striped = false,
  dividers = false,
  bordered = false,
  density = "default",
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(
    initialSort || null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [columnWidths, setColumnWidths] = useState<
    Record<string, string | number>
  >({});
  const initialColumnFiltersRef = useRef(initialColumnFilters);
  initialColumnFiltersRef.current = initialColumnFilters;
  const [columnFilters, setColumnFilters] = useState<
    Record<string, ColumnFilterState>
  >(() => buildInitialColumnFilters(initialColumnFilters));
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(
    () => new Set(),
  );
  const initialColumnWidthsRef = useRef<
    Record<string, string | number | undefined>
  >({});
  const suppressHeaderClickRef = useRef(false);
  const tableRef = useRef<HTMLTableElement>(null);
  const textMeasureContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < mobileBreakpoint;
  });

  const headers = useMemo(() => manualHeaders || [], [manualHeaders]);

  // Reset column widths, expanded columns, filters, and page when headers or
  // the storage key change.
  useEffect(() => {
    const initialWidths: Record<string, string | number | undefined> = {};
    headers.forEach((header) => {
      initialWidths[header.accessor] = header.width;
    });
    initialColumnWidthsRef.current = initialWidths;
    setColumnWidths(
      loadStoredColumnWidths(columnWidthsStorageKey, initialWidths) as Record<
        string,
        string | number
      >,
    );
    setExpandedColumns(new Set());
    setColumnFilters(
      buildInitialColumnFilters(initialColumnFiltersRef.current),
    );
    setCurrentPage(1);
  }, [headers, columnWidthsStorageKey]);

  useEffect(() => {
    if (!columnWidthsStorageKey || typeof window === "undefined") return;
    if (Object.keys(columnWidths).length === 0) return;
    window.localStorage.setItem(
      columnWidthsStorageKey,
      JSON.stringify(columnWidths),
    );
  }, [columnWidths, columnWidthsStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleResize = () =>
      setIsMobile(window.innerWidth < mobileBreakpoint);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mobileBreakpoint]);

  const measureTextWidth = (text: any): number => {
    if (typeof document === "undefined") return String(text ?? "").length * 8;
    const ctx =
      textMeasureContextRef.current ||
      (() => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (tableRef.current && context) {
          const font = window.getComputedStyle(tableRef.current).font;
          context.font = font || "12px sans-serif";
        }
        textMeasureContextRef.current = context;
        return context;
      })();
    return ctx ? ctx.measureText(String(text ?? "")).width : 0;
  };

  const parseWidthValue = (
    value: string | number | undefined,
    fallback: number,
  ): number => {
    if (typeof value === "number" && !Number.isNaN(value)) return value;
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return fallback;
  };

  const rows = useMemo(() => {
    if (!Array.isArray(manualRowData)) return [];

    const src = manualRowData
      .filter(Boolean)
      .filter((r) => typeof r === "object");

    const makeSafeId = (full: any, idx: number): string => {
      const rawId = full?.id;
      const v1 =
        rawId !== undefined && rawId !== null && String(rawId).trim() !== ""
          ? String(rawId).trim()
          : "";
      const v2 = [
        full?.order_id,
        full?.bom_id,
        full?.bom_workstation_status_id,
        full?.bom_data_id,
        full?.unique_task_info_id,
        full?.order_data_id,
      ]
        .filter((v) => v !== undefined && v !== null && String(v) !== "")
        .join("-");
      return v1 || `${v2}-row${idx}`;
    };

    return src.map((full: any, idx: number) => {
      const id = makeSafeId(full, idx);
      const base: any = { id, "#": idx + 1, _meta: full };
      headers.forEach((h) => {
        if (!["#", "details_meta"].includes(h.accessor)) {
          base[h.accessor] = full?.[h.accessor] ?? "";
        }
      });
      return base;
    });
  }, [manualRowData, headers]);

  // Distinct values per filterable column, for the filter dropdown checklists.
  const distinctValuesByColumn = useMemo(() => {
    const map: Record<string, string[]> = {};
    const anyFilterable = headers.some((h) => h.isFilterable ?? filterable);
    if (!anyFilterable) return map;
    headers.forEach((header) => {
      if (!(header.isFilterable ?? filterable)) return;
      const set = new Set<string>();
      rows.forEach((r) => set.add(String(r[header.accessor] ?? "")));
      const arr = Array.from(set);
      arr.sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
      );
      map[header.accessor] = arr;
    });
    return map;
  }, [rows, headers, filterable]);

  const filteredRows = useMemo(() => {
    const active = Object.entries(columnFilters).filter(
      ([, f]) => f.search.trim() !== "" || f.excluded.size > 0,
    );
    if (active.length === 0) return rows;
    return rows.filter((row) =>
      active.every(([accessor, filter]) => {
        const val = String(row[accessor] ?? "");
        if (
          filter.search.trim() !== "" &&
          !val.toLowerCase().includes(filter.search.trim().toLowerCase())
        ) {
          return false;
        }
        if (filter.excluded.size > 0 && filter.excluded.has(val)) return false;
        return true;
      }),
    );
  }, [rows, columnFilters]);

  // Report the current post-filter row set (ignores pagination) so callers can
  // scope actions like "select all" to the visible/filtered rows.
  const onVisibleRowsChangeRef = useRef(onVisibleRowsChange);
  onVisibleRowsChangeRef.current = onVisibleRowsChange;
  useEffect(() => {
    onVisibleRowsChangeRef.current?.(filteredRows);
  }, [filteredRows]);

  const sortedRows = useMemo(() => {
    if (!sortConfig || !sortConfig.key) {
      return filteredRows;
    }
    const sortableRows = [...filteredRows];
    sortableRows.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal < bVal) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
    return sortableRows;
  }, [filteredRows, sortConfig]);

  const effectiveShouldPaginate =
    shouldPaginate && sortedRows.length > rowsPerPage;

  const totalPages = effectiveShouldPaginate
    ? Math.ceil(sortedRows.length / rowsPerPage)
    : 1;

  // Clamp page to valid range — avoids setState-during-render
  const safePage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1;

  const paginatedRows = useMemo(() => {
    if (!effectiveShouldPaginate) return sortedRows;
    const startIndex = (safePage - 1) * rowsPerPage;
    return sortedRows.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedRows, safePage, rowsPerPage, effectiveShouldPaginate]);

  const handleSort = (key: string, isSortable?: boolean) => {
    if (!isSortable) return;
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  // ============= Filter handlers =============

  const setColumnSearch = (accessor: string, value: string) => {
    setColumnFilters((prev) => ({
      ...prev,
      [accessor]: {
        search: value,
        excluded: prev[accessor]?.excluded ?? new Set<string>(),
      },
    }));
    setCurrentPage(1);
  };

  const setColumnExcluded = (accessor: string, next: Set<string>) => {
    setColumnFilters((prev) => ({
      ...prev,
      [accessor]: {
        search: prev[accessor]?.search ?? "",
        excluded: next,
      },
    }));
    setCurrentPage(1);
  };

  const clearColumnFilter = (accessor: string) => {
    setColumnFilters((prev) => {
      if (!prev[accessor]) return prev;
      const next = { ...prev };
      delete next[accessor];
      return next;
    });
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setColumnFilters({});
    setCurrentPage(1);
  };

  const anyFilterActive = Object.values(columnFilters).some(
    (f) => f.search.trim() !== "" || f.excluded.size > 0,
  );

  const setColumnSort = (accessor: string, direction: "asc" | "desc") => {
    setSortConfig({ key: accessor, direction });
    setCurrentPage(1);
  };

  // ============= Column width / resize =============

  const autoSizeColumn = (colIndex: number, header: TableHeader) => {
    if (!tableRef.current) return;
    const tableEl = tableRef.current;
    let maxWidth = measureTextWidth(header?.label || "");

    const collectCellWidth = (cell: HTMLTableCellElement | null) => {
      if (!cell) return;
      const scrollWidth = cell.scrollWidth || cell.offsetWidth || 0;
      const style = window.getComputedStyle(cell);
      const borderWidth =
        parseFloat(style.borderLeftWidth || "0") +
        parseFloat(style.borderRightWidth || "0");
      maxWidth = Math.max(maxWidth, Math.ceil(scrollWidth + borderWidth));
    };

    const headerCell =
      tableEl.tHead?.rows?.[0]?.cells?.[colIndex] ||
      tableEl.querySelector(`thead th:nth-child(${colIndex + 1})`);
    collectCellWidth(headerCell as HTMLTableCellElement);

    const bodyRows = tableEl.tBodies?.[0]?.rows || [];
    for (const row of bodyRows) {
      collectCellWidth(row.cells?.[colIndex] as HTMLTableCellElement);
    }

    rows.forEach((r) => {
      maxWidth = Math.max(
        maxWidth,
        Math.ceil(measureTextWidth(r[header.accessor])),
      );
    });

    const minWidthPx = parseWidthValue(
      header?.minWidth,
      parseWidthValue(minColWidth, 50),
    );
    const finalWidth = Math.max(maxWidth + 12, minWidthPx);
    setColumnWidths((prev) => ({
      ...prev,
      [header.accessor]: `${finalWidth}px`,
    }));
  };

  const resetColumnWidth = (accessor: string) => {
    const regularWidth = initialColumnWidthsRef.current[accessor];
    setColumnWidths((prev) => {
      if (regularWidth === undefined) {
        const next = { ...prev };
        delete next[accessor];
        return next;
      }
      return { ...prev, [accessor]: regularWidth };
    });
  };

  const handleHeaderClick = (header: TableHeader, colIndex: number) => {
    if (suppressHeaderClickRef.current) {
      suppressHeaderClickRef.current = false;
      return;
    }

    if (mobileAutoSizeOnHeaderClick && isMobile) {
      const isExpanded = expandedColumns.has(header.accessor);
      if (isExpanded) {
        resetColumnWidth(header.accessor);
        setExpandedColumns((prev) => {
          const next = new Set(prev);
          next.delete(header.accessor);
          return next;
        });
      } else {
        autoSizeColumn(colIndex, header);
        setExpandedColumns((prev) => {
          const next = new Set(prev);
          next.add(header.accessor);
          return next;
        });
      }
      return;
    }
    handleSort(header.accessor, header.isSortable);
  };

  const getSortIcon = (key: string): React.ReactNode => {
    if (mobileAutoSizeOnHeaderClick && isMobile) return null;
    if (!sortConfig || sortConfig.key !== key) {
      return <SortIcon className="apt-sort-icon" />;
    }
    return sortConfig.direction === "asc" ? (
      <SortUpIcon className="apt-sort-icon apt-sort-icon-active" />
    ) : (
      <SortDownIcon className="apt-sort-icon apt-sort-icon-active" />
    );
  };

  const handleMouseDown = (e: React.MouseEvent, accessor: string) => {
    e.preventDefault();
    suppressHeaderClickRef.current = true;
    const startX = e.clientX;
    const th = (e.target as HTMLElement).closest("th");
    if (!th) return;

    const header = headers.find((h) => h.accessor === accessor);
    const minResizeWidth = parseWidthValue(header?.minWidth, minColWidth);

    const startWidth = th.offsetWidth;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = startWidth + deltaX;
      const finalWidth = Math.max(newWidth, minResizeWidth);

      setColumnWidths((prev) => ({
        ...prev,
        [accessor]: `${finalWidth}px`,
      }));
    };

    const handleMouseUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      // Clear the one-shot suppression after click dispatch for this gesture.
      window.setTimeout(() => {
        suppressHeaderClickRef.current = false;
      }, 0);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const containerClassName = [
    "apt-table-container",
    striped && "apt-striped",
    dividers && "apt-dividers",
    bordered && "apt-bordered",
    density === "compact" && "apt-compact",
  ]
    .filter(Boolean)
    .join(" ");

  // Distinguish "no data at all" from "data filtered out": keep the header (and
  // its filter controls) visible in the latter case so the user can undo it.
  const noData = rows.length === 0;
  const noMatches = !noData && sortedRows.length === 0;

  const containerStyle: CSSProperties = {
    height: noData ? height : !effectiveShouldPaginate ? "auto" : height,
    maxHeight: !effectiveShouldPaginate ? height : undefined,
  };

  const spanCount = headers.length;

  return (
    <div className={containerClassName} style={containerStyle}>
      {noData ? (
        <div className="apt-empty-state">No rows to display.</div>
      ) : (
        <>
          <div className="apt-scroll-area">
            <table className="apt-table" ref={tableRef}>
              <colgroup>
                {headers.map((header) => (
                  <col
                    key={`col-${header.accessor}`}
                    style={{
                      width: columnWidths[header.accessor],
                      minWidth: `${parseWidthValue(
                        header.minWidth,
                        minColWidth,
                      )}px`,
                    }}
                  />
                ))}
              </colgroup>
              <thead className="apt-thead">
                <tr>
                  {headers.map((header, idx) => {
                    const columnFilterable =
                      header.isFilterable ?? filterable;
                    const isHeaderClickable =
                      (mobileAutoSizeOnHeaderClick && isMobile) ||
                      header.isSortable;
                    return (
                      <th
                        key={header.accessor}
                        onClick={() => handleHeaderClick(header, idx)}
                        className={`apt-th ${
                          isHeaderClickable ? "apt-th-sortable" : ""
                        }`}
                      >
                        <div className="apt-th-content">
                          <span className="apt-th-label">{header.label}</span>
                          {header.isSortable &&
                            !(mobileAutoSizeOnHeaderClick && isMobile) &&
                            getSortIcon(header.accessor)}
                          {columnFilterable && (
                            <ColumnFilter
                              columnKey={header.accessor}
                              label={header.label}
                              distinctValues={
                                distinctValuesByColumn[header.accessor] || []
                              }
                              search={
                                columnFilters[header.accessor]?.search ?? ""
                              }
                              excluded={
                                columnFilters[header.accessor]?.excluded ??
                                new Set<string>()
                              }
                              sortConfig={sortConfig}
                              isSortable={header.isSortable}
                              onSort={(dir) =>
                                setColumnSort(header.accessor, dir)
                              }
                              onSearchChange={(value) =>
                                setColumnSearch(header.accessor, value)
                              }
                              onExcludedChange={(next) =>
                                setColumnExcluded(header.accessor, next)
                              }
                              onClear={() =>
                                clearColumnFilter(header.accessor)
                              }
                              onClearAll={clearAllFilters}
                              anyFilterActive={anyFilterActive}
                            />
                          )}
                        </div>
                        <div
                          className="apt-resizer"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            handleMouseDown(e, header.accessor);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="apt-tbody">
                {noMatches && (
                  <tr className="apt-row">
                    <td colSpan={spanCount} className="apt-td apt-no-matches">
                      No rows match the current filters.
                    </td>
                  </tr>
                )}
                {paginatedRows.map((row, rowIdx) => {
                  const isExpanded = expandedRowId === row.id;
                  const isFullRow =
                    typeof renderFullRow === "function" && row?._meta?.fullRow;
                  const altClass = rowIdx % 2 === 1 ? "apt-row-alt" : "";
                  return (
                    <Fragment key={row.id}>
                      {isFullRow ? (
                        <tr
                          className={`apt-row ${altClass} ${rowClassName ? rowClassName(row) : ""}`}
                          onClick={() => onRowClick && onRowClick(row)}
                        >
                          <td
                            colSpan={spanCount}
                            className="apt-td"
                            style={{ padding: 0 }}
                          >
                            {renderFullRow(row)}
                          </td>
                        </tr>
                      ) : (
                        <tr
                          className={`apt-row ${altClass} ${rowClassName ? rowClassName(row) : ""}`}
                          onClick={() => onRowClick && onRowClick(row)}
                          style={{ height: `${rowHeight}px` }}
                        >
                          {headers.map((header) => {
                            const value = row[header.accessor];
                            const cellContent = header.cellRenderer
                              ? header.cellRenderer({ row, value })
                              : value;
                            return (
                              <td
                                key={`${row.id}-${header.accessor}`}
                                className={
                                  header.accessor === "actions"
                                    ? "apt-td-actions"
                                    : "apt-td"
                                }
                              >
                                {header.accessor === "actions" ? (
                                  <div onClick={(e) => e.stopPropagation()}>
                                    {cellContent}
                                  </div>
                                ) : (
                                  cellContent
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      )}
                      {isExpanded &&
                        typeof renderExpandedRow === "function" && (
                          <tr className="apt-row-expanded">
                            <td
                              colSpan={spanCount}
                              className="apt-td"
                              style={{ padding: 0 }}
                            >
                              {renderExpandedRow(row)}
                            </td>
                          </tr>
                        )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {(shouldPaginate && totalPages > 1) ||
          (Array.isArray(rowsPerPageOptions) &&
            rowsPerPageOptions.length > 0 &&
            onRowsPerPageChange) ? (
            <div className="apt-footer">
              <div className="apt-footer-left">
                {Array.isArray(rowsPerPageOptions) &&
                  rowsPerPageOptions.length > 0 &&
                  onRowsPerPageChange && (
                    <>
                      <label className="apt-rows-label">Rows</label>
                      <select
                        value={rowsPerPage}
                        onChange={(e) =>
                          onRowsPerPageChange(Number(e.target.value))
                        }
                        className="apt-rows-select"
                      >
                        {rowsPerPageOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
              </div>
              <div className="apt-footer-center">
                {totalPages > 1 ? `Page ${safePage} of ${totalPages}` : ""}
              </div>
              <div className="apt-footer-right">
                {totalPages > 1 ? (
                  <>
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      className="apt-btn"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={safePage === totalPages}
                      className="apt-btn"
                    >
                      Next
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

export default Table;
