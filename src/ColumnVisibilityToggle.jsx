import { useState, useRef, useEffect } from "react";
import { MdViewColumn } from "react-icons/md";

/**
 * ColumnVisibilityToggle - A dropdown menu that allows users to toggle column visibility
 *
 * @param {Array} availableColumns - Array of column objects with { key, label }
 * @param {Array} visibleColumns - Array of column keys that are currently visible
 * @param {Function} onColumnsChange - Callback function when visible columns change
 * @param {String} storageKey - Optional localStorage key to persist user preferences
 */
export default function ColumnVisibilityToggle({
  availableColumns,
  visibleColumns,
  onColumnsChange,
  storageKey,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const saveToStorage = (columns) => {
    if (storageKey && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(columns));
      } catch (error) {
        console.warn(
          "Failed to save column visibility to localStorage:",
          error,
        );
      }
    }
  };

  const handleToggleColumn = (columnKey) => {
    const newVisibleColumns = visibleColumns.includes(columnKey)
      ? visibleColumns.filter((key) => key !== columnKey)
      : [...visibleColumns, columnKey];

    saveToStorage(newVisibleColumns);
    onColumnsChange(newVisibleColumns);
  };

  const handleSelectAll = () => {
    const allKeys = availableColumns.map((col) => col.key);
    saveToStorage(allKeys);
    onColumnsChange(allKeys);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-[#444] bg-gray-50 dark:bg-[#333] px-3 py-2 text-sm font-medium text-primary shadow-md hover:bg-gray-100 dark:hover:bg-[#444] transition-colors focus:outline-none"
        aria-label="Toggle column visibility"
        aria-expanded={isOpen}
      >
        <MdViewColumn className="text-lg" />
        <span>Columns</span>
        <span className="text-xs opacity-70">({visibleColumns.length})</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-lg border border-gray-300 dark:border-[#444] bg-white dark:bg-[#222] shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="p-3">
            <div className="flex items-center justify-between mb-3 border-b border-gray-200 dark:border-[#444] pb-2">
              <h3 className="text-sm font-semibold text-primary">
                Toggle Columns
              </h3>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
              >
                Select All
              </button>
            </div>
            <div className="space-y-1">
              {availableColumns.map((column) => {
                const isVisible = visibleColumns.includes(column.key);
                return (
                  <label
                    key={column.key}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#333] px-2 py-1.5 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={() => handleToggleColumn(column.key)}
                      className="w-4 h-4 text-purple-600 rounded-xl cursor-pointer"
                    />
                    <span className="text-sm text-primary flex-1">
                      {column.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
