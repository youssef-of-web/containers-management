import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/containers": {
        target: "http://localhost:4200",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
