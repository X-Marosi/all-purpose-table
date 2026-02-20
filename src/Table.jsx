import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";

export default function Table({
  manualHeaders,
  manualRowData,
  theme,
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
}) {
  const [sortConfig, setSortConfig] = useState(initialSort || null);
  const [currentPage, setCurrentPage] = useState(1);
  const [columnWidths, setColumnWidths] = useState({});
  const [expandedColumns, setExpandedColumns] = useState(() => new Set());
  const initialColumnWidthsRef = useRef({});
  const tableRef = useRef(null);
  const textMeasureContextRef = useRef(null);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < mobileBreakpoint;
  });

  const headers = useMemo(() => manualHeaders || [], [manualHeaders]);

  const loadStoredColumnWidths = (fallback) => {
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
    const initialWidths = {};
    headers.forEach((header) => {
      initialWidths[header.accessor] = header.width;
    });
    initialColumnWidthsRef.current = initialWidths;
    setColumnWidths(loadStoredColumnWidths(initialWidths));
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

  const measureTextWidth = (text) => {
    if (typeof document === "undefined") return String(text ?? "").length * 8;
    const ctx =
      textMeasureContextRef.current ||
      (() => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (tableRef.current) {
          const font = window.getComputedStyle(tableRef.current).font;
          context.font = font || "12px sans-serif";
        }
        textMeasureContextRef.current = context;
        return context;
      })();
    return ctx ? ctx.measureText(String(text ?? "")).width : 0;
  };

  const parseWidthValue = (value, fallback) => {
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

    const makeSafeId = (full, idx) => {
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

    return src.map((full, idx) => {
      const id = makeSafeId(full, idx);
      const base = { id, "#": idx + 1, _meta: full };
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

  // If there are not enough rows to fill a page, disable pagination and
  // allow the table to size to its content (so consumers don't need to
  // special-case layout when there are only a few rows).
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

  const handleSort = (key, isSortable) => {
    if (!isSortable) return;
    let direction = "asc";
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

  const autoSizeColumn = (colIndex, header) => {
    if (!tableRef.current) return;
    const tableEl = tableRef.current;
    let maxWidth = measureTextWidth(header?.label || "");

    const collectCellWidth = (cell) => {
      if (!cell) return;
      const scrollWidth = cell.scrollWidth || cell.offsetWidth || 0;
      const style = window.getComputedStyle(cell);
      const borderWidth =
        parseFloat(style.borderLeftWidth || 0) +
        parseFloat(style.borderRightWidth || 0);
      maxWidth = Math.max(maxWidth, Math.ceil(scrollWidth + borderWidth));
    };

    const headerCell =
      tableEl.tHead?.rows?.[0]?.cells?.[colIndex] ||
      tableEl.querySelector(`thead th:nth-child(${colIndex + 1})`);
    collectCellWidth(headerCell);

    const bodyRows = tableEl.tBodies?.[0]?.rows || [];
    for (const row of bodyRows) {
      collectCellWidth(row.cells?.[colIndex]);
    }

    // Consider unseen rows using text width as a fallback.
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

  const resetColumnWidth = (accessor) => {
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

  const handleHeaderClick = (header, colIndex) => {
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

  const getSortIcon = (key) => {
    if (mobileAutoSizeOnHeaderClick && isMobile) return null;
    if (!sortConfig || sortConfig.key !== key) {
      return <FaSort className="inline-block ml-1 opacity-30" />;
    }
    return sortConfig.direction === "asc" ? (
      <FaSortUp className="inline-block ml-1" />
    ) : (
      <FaSortDown className="inline-block ml-1" />
    );
  };

  const handleMouseDown = (e, accessor) => {
    e.preventDefault();
    const startX = e.clientX;
    const th = e.target.closest("th");
    if (!th) return;

    const header = headers.find((h) => h.accessor === accessor);
    const minResizeWidth = parseWidthValue(header?.minWidth, minColWidth);

    const startWidth = th.offsetWidth;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (moveEvent) => {
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

  return (
    <div
      className="basic-table-container text-gray-800 dark:text-[#EEE] rounded-md mx-1.5 border border-gray-300 dark:border-[#333] bg-white dark:bg-[#1E1E1E] shadow-sm"
      style={{
        // When there are rows but pagination is disabled due to few rows,
        // let the container size to its content but keep it bounded by the
        // provided `height` (via maxHeight) so the inner scroll area can
        // show a scrollbar when content overflows the viewport.
        height:
          sortedRows.length === 0
            ? height
            : !effectiveShouldPaginate
              ? "auto"
              : height,
        maxHeight: !effectiveShouldPaginate ? height : undefined,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {sortedRows.length === 0 ? (
        <div className="flex-grow flex items-center justify-center text-center py-12 text-gray-400 dark:text-[#444]">
          No rows to display.
        </div>
      ) : (
        <>
          <div className="flex-grow overflow-auto">
            <table
              className="w-full text-left text-xs alu"
              ref={tableRef}
              style={{ tableLayout: "fixed" }}
            >
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
              <thead className="sticky top-0 bg-gray-200 dark:bg-[#333] z-10">
                <tr>
                  {headers.map((header, idx) => {
                    const isHeaderClickable =
                      (mobileAutoSizeOnHeaderClick && isMobile) ||
                      header.isSortable;
                    return (
                      <th
                        key={header.accessor}
                        onClick={() => handleHeaderClick(header, idx)}
                        className={`relative px-2 py-3 ${
                          isHeaderClickable
                            ? "cursor-pointer hover:bg-gray-300 dark:hover:bg-[#444]"
                            : ""
                        }`}
                      >
                        <div className="flex items-center justify-center">
                          {header.label}
                          {header.isSortable &&
                            !(mobileAutoSizeOnHeaderClick && isMobile) &&
                            getSortIcon(header.accessor)}
                        </div>
                        <div
                          className="resizer"
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
              <tbody className="divide-y divide-gray-300 dark:divide-[#333]">
                {paginatedRows.map((row) => {
                  const isExpanded = expandedRowId === row.id;
                  const isFullRow =
                    typeof renderFullRow === "function" && row?._meta?.fullRow;
                  return (
                    <Fragment key={row.id}>
                      {isFullRow ? (
                        <tr
                          className={`
                            hover:bg-gray-200 dark:hover:bg-[#888]/20
                            ${rowClassName ? rowClassName(row) : ""}
                          `}
                          onClick={() => onRowClick && onRowClick(row)}
                        >
                          <td colSpan={headers.length} className="p-0">
                            {renderFullRow(row)}
                          </td>
                        </tr>
                      ) : (
                        <tr
                          className={`
                            hover:bg-gray-200 dark:hover:bg-[#888]/20
                            ${rowClassName ? rowClassName(row) : ""}
                          `}
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
                                className="px-2 py-1 whitespace-nowrap overflow-hidden text-ellipsis"
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
                          <tr className="bg-gray-50 dark:bg-[#2b2b2b]">
                            <td colSpan={headers.length} className="p-0">
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
          (Array.isArray(rowsPerPageOptions) && rowsPerPageOptions.length) ? (
            <div className="grid grid-cols-3 items-center p-2 bg-gray-200 dark:bg-[#333]">
              <div className="flex items-center gap-2">
                {Array.isArray(rowsPerPageOptions) &&
                  rowsPerPageOptions.length > 0 &&
                  onRowsPerPageChange && (
                    <>
                      <label className="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-300">
                        Rows
                      </label>
                      <select
                        value={rowsPerPage}
                        onChange={(e) =>
                          onRowsPerPageChange(Number(e.target.value))
                        }
                        className="px-2 py-1 text-sm rounded bg-white dark:bg-[#444] border border-gray-300 dark:border-[#555]"
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
              <div className="justify-self-center text-sm text-gray-700 dark:text-gray-300">
                {shouldPaginate && totalPages > 1
                  ? `Page ${currentPage} of ${totalPages}`
                  : ""}
              </div>
              <div className="justify-self-end flex items-center gap-2">
                {shouldPaginate && totalPages > 1 ? (
                  <>
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm rounded bg-white dark:bg-[#444] hover:bg-gray-300 dark:hover:bg-[#555] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm rounded bg-white dark:bg-[#444] hover:bg-gray-300 dark:hover:bg-[#555] disabled:opacity-50 disabled:cursor-not-allowed"
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
}
