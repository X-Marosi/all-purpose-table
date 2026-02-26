# All Purpose Table

A production-grade, plug-and-play React table component with TypeScript support and zero dependencies.

Demos can be found at: https://apt-demos.vercel.app/

## ✨ Features

- 🎯 **Plug and Play** - Install and use, no configuration needed
- 📦 **Zero Dependencies** — No CSS frameworks or icon libraries required
- 🟦 **TypeScript Native** — Full type safety and IntelliSense support
- 🌑 **Dark Mode** — `prefers-color-scheme` and manual class toggling (`.dark`, `html.dark`)
- 📊 **Feature Rich**:
  - Sorting per column
  - Pagination with configurable rows per page
  - Column visibility toggle
  - Column resizing (drag) with optional localStorage persistence
  - Expandable rows
  - Custom cell renderers
  - Full custom row rendering
  - Row click handlers
  - Scrollable body with fixed header
  - Mobile responsive with optional auto-sizing on header click

## 📦 Installation

```bash
npm install all-purpose-table
```

## ⚡ Quick Start

```tsx
import { Table } from "all-purpose-table";

function App() {
  const headers = [
    { accessor: "id",    label: "ID",    isSortable: true },
    { accessor: "name",  label: "Name",  isSortable: true },
    { accessor: "email", label: "Email" },
  ];

  const data = [
    { id: 1, name: "John Doe",   email: "john@example.com" },
    { id: 2, name: "Jane Smith", email: "jane@example.com" },
  ];

  return <Table manualHeaders={headers} manualRowData={data} />;
}
```

## 📖 API Reference

### Table Props

| Prop                          | Type                 | Default         | Description                                                                     |
| ----------------------------- | -------------------- | --------------- | ------------------------------------------------------------------------------- |
| `manualHeaders`               | `TableHeader[]`      | **required**    | Array of column definitions                                                     |
| `manualRowData`               | `object[]`           | **required**    | Array of data objects                                                           |
| `height`                      | `string`             | `"100%"`        | Table container height                                                          |
| `rowHeight`                   | `number`             | `40`            | Height of each row in pixels                                                    |
| `shouldPaginate`              | `boolean`            | `true`          | Enable/disable pagination                                                       |
| `rowsPerPage`                 | `number`             | `60`            | Number of rows per page                                                         |
| `initialSort`                 | `SortConfig`         | `null`          | Initial sort configuration                                                      |
| `rowClassName`                | `(row) => string`    | `undefined`     | Custom row class names                                                          |
| `onRowClick`                  | `(row) => void`      | `undefined`     | Row click handler                                                               |
| `minColWidth`                 | `number`             | `50`            | Minimum column width in pixels                                                  |
| `columnWidthsStorageKey`      | `string`             | `undefined`     | localStorage key for persisting column widths                                   |
| `rowsPerPageOptions`          | `number[]`           | `[20, 50, 100]` | Options for rows per page selector                                              |
| `onRowsPerPageChange`         | `(value) => void`    | `undefined`     | Callback when rows per page changes                                             |
| `expandedRowId`               | `string`             | `null`          | ID of currently expanded row                                                    |
| `renderExpandedRow`           | `(row) => ReactNode` | `undefined`     | Render function for expanded row content                                        |
| `renderFullRow`               | `(row) => ReactNode` | `undefined`     | Render function for custom full-width rows (can be used as header/dropdown row) |
| `mobileAutoSizeOnHeaderClick` | `boolean`            | `false`         | Enable mobile auto-sizing on header click                                       |
| `mobileBreakpoint`            | `number`             | `768`           | Mobile breakpoint in pixels                                                     |

### TableHeader Interface

```typescript
interface TableHeader {
  accessor: string; // Key to access data in row object
  label: string; // Display label for column
  isSortable?: boolean; // Enable sorting for this column
  width?: string | number; // Initial column width
  minWidth?: string | number; // Minimum column width
  cellRenderer?: (args: {
    // Custom cell renderer
    row: any;
    value: any;
  }) => React.ReactNode;
}
```

## 🔩 Advanced Usage

### Custom Cell Renderers

```tsx
const headers: TableHeader[] = [
  {
    accessor: "status",
    label: "Status",
    cellRenderer: ({ value }) => (
      <span className={`badge badge-${value.toLowerCase()}`}>{value}</span>
    ),
  },
  {
    accessor: "actions",
    label: "Actions",
    // Cells with accessor "actions" automatically stop row-click propagation
    cellRenderer: ({ row }) => (
      <button onClick={() => handleEdit(row.id)}>Edit</button>
    ),
  },
];
```

### Expandable Rows

```tsx
const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

<Table
  manualHeaders={headers}
  manualRowData={data}
  expandedRowId={expandedRowId}
  onRowClick={(row) =>
    setExpandedRowId(expandedRowId === row.id ? null : row.id)
  }
  renderExpandedRow={(row) => (
    <div style={{ padding: 16 }}>
      <p>Details for {row.name}</p>
    </div>
  )}
/>
```

### Full Custom Row

Set `fullRow: true` on any data object to replace that row entirely with `renderFullRow`:

```tsx
const data = [
  { id: 1, name: "John" },
  { id: "divider", fullRow: true }, // uses renderFullRow
];

<Table
  manualHeaders={headers}
  manualRowData={data}
  renderFullRow={(row) => (
    <div style={{ padding: "8px 16px", fontWeight: "bold" }}>Section Header</div>
  )}
/>
```

### Rows Per Page Selector

The footer (including the dropdown) only renders when `onRowsPerPageChange` is provided:

```tsx
const [rowsPerPage, setRowsPerPage] = useState(20);

<Table
  manualHeaders={headers}
  manualRowData={data}
  rowsPerPage={rowsPerPage}
  rowsPerPageOptions={[10, 20, 50, 100]}
  onRowsPerPageChange={setRowsPerPage}
/>
```

### Persistent Column Widths

```tsx
<Table
  manualHeaders={headers}
  manualRowData={data}
  columnWidthsStorageKey="my-table-columns"
/>
```

### Column Visibility Toggle

```tsx
import { Table, ColumnVisibilityToggle } from "all-purpose-table";

function App() {
  const [visibleColumns, setVisibleColumns] = useState(["id", "name", "email"]);

  const availableColumns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
  ];

  const filteredHeaders = headers.filter((h) =>
    visibleColumns.includes(h.accessor),
  );

  return (
    <div>
      <ColumnVisibilityToggle
        availableColumns={availableColumns}
        visibleColumns={visibleColumns}
        onColumnsChange={setVisibleColumns}
        storageKey="my-table-visible-columns"
      />
      <Table manualHeaders={filteredHeaders} manualRowData={data} />
    </div>
  );
}
```

## 🎨 Styling & Customization

The table comes with built-in styles. All CSS classes are prefixed with `apt-` to avoid conflicts.

### Dark Mode

Dark mode is toggled by adding the `dark` class to any ancestor element (e.g. `<html>` or a wrapper `<div>`):

```jsx
// Toggle dark mode
document.documentElement.classList.toggle("dark");
```

No extra configuration is needed — the component responds automatically.

### CSS Variables

Override CSS variables to customise colours, spacing, and more:

```css
:root {
  --apt-color-primary: #1f2937;
  --apt-color-border: #d1d5db;
  --apt-color-bg: white;
  --apt-color-bg-secondary: #f9fafb;
  --apt-color-accent: #9333ea;
  /* ... and more */
}
```

### CSS Class Reference

| Class | Element |
|---|---|
| `.apt-table-container` | Outermost wrapper |
| `.apt-scroll-area` | Scrollable region (contains both table parts) |
| `.apt-thead-wrapper` | Fixed header wrapper |
| `.apt-tbody-wrapper` | Scrollable body wrapper |
| `.apt-table` | `<table>` element |
| `.apt-thead` | `<thead>` |
| `.apt-tbody` | `<tbody>` |
| `.apt-row` | `<tr>` |
| `.apt-td` | `<td>` / `<th>` |
| `.apt-footer` | Pagination footer |

## 🔧 Framework Compatibility

- ✅ Next.js (App Router & Pages Router)
- ✅ Vite
- ✅ Create React App
- ✅ Remix
- ✅ Any React 17+ project

> **Note:** The component uses browser APIs (`localStorage`, `ResizeObserver`, `window`) — wrap it in a client-only boundary when using SSR frameworks like Next.js App Router.

## 🏭 Production Ready

- **Tree-shakeable** — Only bundle what you use
- **TypeScript** — Full type definitions included
- **Zero dependencies** — No external libraries required
- **Performant** — `useMemo` and derived state throughout, no unnecessary re-renders

## 📄 License

MIT
