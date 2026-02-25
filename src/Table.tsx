import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  CSSProperties,
} from "react";

// ============= TypeScript Interfaces =============

export interface TableHeader {
  accessor: string;
  label: string;
  isSortable?: boolean;
  width?: string | number;
  minWidth?: string | number;
  cellRenderer?: (args: { row: any; value: any }) => React.ReactNode;
}

export interface SortConfig {
  key: string;
  direction: "asc" | "desc";
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
}

// ============= SVG Icons (replaced react-icons) =============

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
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(
    initialSort || null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [columnWidths, setColumnWidths] = useState<
    Record<string, string | number>
  >({});
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(
    () => new Set(),
  );
  const initialColumnWidthsRef = useRef<
    Record<string, string | number | undefined>
  >({});
  const tableRef = useRef<HTMLTableElement>(null);
  const textMeasureContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < mobileBreakpoint;
  });

  const headers = useMemo(() => manualHeaders || [], [manualHeaders]);

  const loadStoredColumnWidths = (
    fallback: Record<string, string | number | undefined>,
  ) => {
    if (!columnWidthsStorageKey || typeof window === "undefined") {
      return fallback;
    }
    try {
      const raw = window.localStorage.getItem(columnWidthsStorageKey);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return fallback;
      const next = { ...fallback };
      Object.keys(next).forEach((key) => {
        const val = parsed[key];
        if (typeof val === "number" || typeof val === "string") {
          next[key] = val;
        }
      });
      return next;
    } catch {
      return fallback;
    }
  };

  useEffect(() => {
    const initialWidths: Record<string, string | number | undefined> = {};
    headers.forEach((header) => {
      initialWidths[header.accessor] = header.width;
    });
    initialColumnWidthsRef.current = initialWidths;
    setColumnWidths(
      loadStoredColumnWidths(initialWidths) as Record<string, string | number>,
    );
    setExpandedColumns(new Set());
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

  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage]);

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

  const sortedRows = useMemo(() => {
    if (!sortConfig || !sortConfig.key) {
      return rows;
    }
    const sortableRows = [...rows];
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
  }, [rows, sortConfig]);

  const effectiveShouldPaginate =
    shouldPaginate && sortedRows.length > rowsPerPage;

  const totalPages = effectiveShouldPaginate
    ? Math.ceil(sortedRows.length / rowsPerPage)
    : 1;

  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

  const paginatedRows = useMemo(() => {
    if (!effectiveShouldPaginate) return sortedRows;
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedRows.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedRows, currentPage, rowsPerPage, effectiveShouldPaginate]);

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
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const containerStyle: CSSProperties = {
    height:
      sortedRows.length === 0
        ? height
        : !effectiveShouldPaginate
          ? "auto"
          : height,
    maxHeight: !effectiveShouldPaginate ? height : undefined,
  };

  return (
    <div className="apt-table-container" style={containerStyle}>
      {sortedRows.length === 0 ? (
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
                          {header.label}
                          {header.isSortable &&
                            !(mobileAutoSizeOnHeaderClick && isMobile) &&
                            getSortIcon(header.accessor)}
                        </div>
                        <div
                          className="apt-resizer"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            handleMouseDown(e, header.accessor);
                          }}
                        />
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="apt-tbody">
                {paginatedRows.map((row) => {
                  const isExpanded = expandedRowId === row.id;
                  const isFullRow =
                    typeof renderFullRow === "function" && row?._meta?.fullRow;
                  return (
                    <Fragment key={row.id}>
                      {isFullRow ? (
                        <tr
                          className={`apt-row ${rowClassName ? rowClassName(row) : ""}`}
                          onClick={() => onRowClick && onRowClick(row)}
                        >
                          <td
                            colSpan={headers.length}
                            className="apt-td"
                            style={{ padding: 0 }}
                          >
                            {renderFullRow(row)}
                          </td>
                        </tr>
                      ) : (
                        <tr
                          className={`apt-row ${rowClassName ? rowClassName(row) : ""}`}
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
                              colSpan={headers.length}
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
                {totalPages > 1 ? `Page ${currentPage} of ${totalPages}` : ""}
              </div>
              <div className="apt-footer-right">
                {totalPages > 1 ? (
                  <>
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="apt-btn"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
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
