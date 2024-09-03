import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
	build: {
		outDir: "../public",
	},
	server: {
		port: 3000,
		proxy: {
			"^/api.*": {
				target: "http://localhost:3333",
				changeOrigin: false,
				secure: false,
				ws: true,
			},
		},
	},
});
