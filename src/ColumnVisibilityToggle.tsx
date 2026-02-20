import { useState, useRef, useEffect } from "react";

// ============= TypeScript Interfaces =============

export interface ColumnDefinition {
  key: string;
  label: string;
}

export interface ColumnVisibilityToggleProps {
  availableColumns: ColumnDefinition[];
  visibleColumns: string[];
  onColumnsChange: (columns: string[]) => void;
  storageKey?: string;
}

// ============= SVG Icon (replaced react-icons) =============

const ViewColumnIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M10 18h5V5h-5v13zm-6 0h5V5H4v13zM16 5v13h5V5h-5z" />
  </svg>
);

// ============= Main Component =============

const ColumnVisibilityToggle: React.FC<ColumnVisibilityToggleProps> = ({
  availableColumns,
  visibleColumns,
  onColumnsChange,
  storageKey,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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

  const saveToStorage = (columns: string[]) => {
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

  const handleToggleColumn = (columnKey: string) => {
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
    <div className="apt-column-toggle-container" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="apt-column-toggle-btn"
        aria-label="Toggle column visibility"
        aria-expanded={isOpen}
      >
        <ViewColumnIcon className="apt-column-toggle-icon" />
        <span>Columns</span>
        <span className="apt-column-toggle-count">
          ({visibleColumns.length})
        </span>
      </button>

      {isOpen && (
        <div className="apt-column-toggle-menu">
          <div className="apt-column-toggle-menu-inner">
            <div className="apt-column-toggle-header">
              <h3 className="apt-column-toggle-title">Toggle Columns</h3>
              <button
                type="button"
                onClick={handleSelectAll}
                className="apt-column-toggle-select-all"
              >
                Select All
              </button>
            </div>
            <div className="apt-column-toggle-list">
              {availableColumns.map((column) => {
                const isVisible = visibleColumns.includes(column.key);
                return (
                  <label key={column.key} className="apt-column-toggle-item">
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={() => handleToggleColumn(column.key)}
                      className="apt-column-toggle-checkbox"
                    />
                    <span className="apt-column-toggle-label">
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
};

export default ColumnVisibilityToggle;
