import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: "src/index.js",
      name: "AllPurposeTable",
      fileName: (format) => `all-purpose-table.${format}.js`,
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react-icons",
        "react-icons/md",
        "react-icons/fa",
      ],
    },
  },
});