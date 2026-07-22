// Import styles first to ensure they're bundled with the package
import "./styles.css";

// Export components
export { default as Table } from "./Table";
export { default as ColumnVisibilityToggle } from "./ColumnVisibilityToggle";

// Export types for TypeScript consumers
export type {
  TableProps,
  TableHeader,
  SortConfig,
  TableDensity,
} from "./Table";

export type { ColumnFilterProps } from "./ColumnFilter";

export type {
  ColumnVisibilityToggleProps,
  ColumnDefinition,
} from "./ColumnVisibilityToggle";
