# All Purpose Table

A production-grade, plug-and-play React table component with TypeScript support. Zero configuration required. No styling dependencies.

## ✨ Features

- 🎯 **Plug and Play** - Just install and use, no configuration needed
- 📦 **Zero Dependencies** - No Tailwind, no CSS frameworks required
- 🔷 **TypeScript Native** - Full type safety and IntelliSense support
- 🎨 **Dark Mode** - Automatic dark mode support via CSS
- 📊 **Feature Rich**:
  - Sorting (multi-column support)
  - Pagination
  - Column visibility toggle
  - Column resizing
  - Expandable rows
  - Custom cell renderers
  - Row click handlers
  - Persistent column widths (localStorage)
  - Mobile responsive with auto-sizing
  - Virtual scrolling ready

## 📦 Installation

```bash
npm install all-purpose-table
```

## 🚀 Quick Start

### JavaScript

```jsx
import { Table } from "all-purpose-table";

function App() {
  const headers = [
    { accessor: "id", label: "ID", isSortable: true },
    { accessor: "name", label: "Name", isSortable: true },
    { accessor: "email", label: "Email", isSortable: false },
  ];

  const data = [
    { id: 1, name: "John Doe", email: "john@example.com" },
    { id: 2, name: "Jane Smith", email: "jane@example.com" },
  ];

  return <Table manualHeaders={headers} manualRowData={data} />;
}
```

### TypeScript

```tsx
import { Table, TableHeader } from "all-purpose-table";

function App() {
  const headers: TableHeader[] = [
    { accessor: "id", label: "ID", isSortable: true, width: 80 },
    { accessor: "name", label: "Name", isSortable: true, minWidth: 150 },
    { accessor: "email", label: "Email" },
  ];

  const data = [
    { id: 1, name: "John Doe", email: "john@example.com" },
    { id: 2, name: "Jane Smith", email: "jane@example.com" },
  ];

  return <Table manualHeaders={headers} manualRowData={data} />;
}
```

## 📖 API Reference

### Table Props

| Prop                          | Type                 | Default         | Description                                   |
| ----------------------------- | -------------------- | --------------- | --------------------------------------------- |
| `manualHeaders`               | `TableHeader[]`      | **required**    | Array of column definitions                   |
| `manualRowData`               | `object[]`           | **required**    | Array of data objects                         |
| `height`                      | `string`             | `"100%"`        | Table container height                        |
| `rowHeight`                   | `number`             | `40`            | Height of each row in pixels                  |
| `rowsPerPage`                 | `number`             | `60`            | Number of rows per page                       |
| `shouldPaginate`              | `boolean`            | `true`          | Enable/disable pagination                     |
| `initialSort`                 | `SortConfig`         | `null`          | Initial sort configuration                    |
| `rowClassName`                | `(row) => string`    | `undefined`     | Custom row class names                        |
| `onRowClick`                  | `(row) => void`      | `undefined`     | Row click handler                             |
| `minColWidth`                 | `number`             | `50`            | Minimum column width in pixels                |
| `columnWidthsStorageKey`      | `string`             | `undefined`     | localStorage key for persisting column widths |
| `rowsPerPageOptions`          | `number[]`           | `[20, 50, 100]` | Options for rows per page selector            |
| `onRowsPerPageChange`         | `(value) => void`    | `undefined`     | Callback when rows per page changes           |
| `expandedRowId`               | `string`             | `null`          | ID of currently expanded row                  |
| `renderExpandedRow`           | `(row) => ReactNode` | `undefined`     | Render function for expanded row content      |
| `renderFullRow`               | `(row) => ReactNode` | `undefined`     | Render function for custom full-width rows    |
| `mobileAutoSizeOnHeaderClick` | `boolean`            | `false`         | Enable mobile auto-sizing on header click     |
| `mobileBreakpoint`            | `number`             | `768`           | Mobile breakpoint in pixels                   |

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

## 🎨 Advanced Usage

### Custom Cell Renderers

```tsx
const headers: TableHeader[] = [
  {
    accessor: "status",
    label: "Status",
    cellRenderer: ({ value }) => (
      <span className={`status-${value.toLowerCase()}`}>{value}</span>
    ),
  },
  {
    accessor: "actions",
    label: "Actions",
    cellRenderer: ({ row }) => (
      <button onClick={() => handleEdit(row.id)}>Edit</button>
    ),
  },
];
```

### Persistent Column Widths

```tsx
<Table
  manualHeaders={headers}
  manualRowData={data}
  columnWidthsStorageKey="my-table-columns"
/>
```

### Expandable Rows

```tsx
const [expandedRowId, setExpandedRowId] = useState(null);

<Table
  manualHeaders={headers}
  manualRowData={data}
  expandedRowId={expandedRowId}
  onRowClick={(row) =>
    setExpandedRowId(expandedRowId === row.id ? null : row.id)
  }
  renderExpandedRow={(row) => (
    <div className="row-details">
      <p>Additional details for {row.name}</p>
    </div>
  )}
/>;
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

The table comes with built-in styles that support both light and dark modes automatically. All CSS classes are prefixed with `apt-` to avoid conflicts.

### CSS Variables

You can customize colors by overriding CSS variables:

```css
:root {
  --apt-color-primary: #1f2937;
  --apt-color-border: #d1d5db;
  --apt-color-bg: white;
  --apt-color-accent: #9333ea;
  /* ... and more */
}
```

### Custom Styling

All elements have semantic class names:

```css
.apt-table-container {
  /* Main container */
}
.apt-table {
  /* Table element */
}
.apt-thead {
  /* Table header */
}
.apt-tbody {
  /* Table body */
}
.apt-row {
  /* Table row */
}
.apt-td {
  /* Table cell */
}
.apt-footer {
  /* Pagination footer */
}
```

## 🔧 Framework Compatibility

Works seamlessly with:

- ✅ Create React App
- ✅ Next.js (App Router & Pages Router)
- ✅ Vite
- ✅ Remix
- ✅ Any React 17+ project

## 📱 Mobile Support

The table is fully responsive and includes:

- Horizontal scrolling on small screens
- Optional auto-sizing columns on header click
- Touch-friendly column resizing
- Configurable mobile breakpoint

## 🌙 Dark Mode

Dark mode is supported automatically via CSS `prefers-color-scheme`. No JavaScript required!

## 🚢 Production Ready

- **Tree-shakeable** - Only bundle what you use
- **TypeScript** - Full type definitions included
- **SSR Compatible** - Works with server-side rendering
- **Accessible** - Semantic HTML and ARIA attributes
- **Performant** - Optimized for large datasets

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📮 Support

For issues and feature requests, please use the GitHub issues page.
