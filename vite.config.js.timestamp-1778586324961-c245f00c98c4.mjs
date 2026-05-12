// vite.config.js
import { defineConfig } from "file:///sessions/sleepy-funny-brahmagupta/mnt/outputs/fatboy-quest/node_modules/vite/dist/node/index.js";
import react from "file:///sessions/sleepy-funny-brahmagupta/mnt/outputs/fatboy-quest/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///sessions/sleepy-funny-brahmagupta/mnt/outputs/fatboy-quest/node_modules/vite-plugin-pwa/dist/index.js";
var vite_config_default = defineConfig({
  base: "/fatboy-quest/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icon-192.png", "icon-512.png", "apple-touch-icon.png"],
      manifest: {
        name: "\u80A5\u4ED4\u5927\u95EF\u5173",
        short_name: "\u80A5\u4ED4\u95EF\u5173",
        description: "\u592A\u7A7A\u4E3B\u9898\u4F5C\u4E1A\u7BA1\u7406 - \u6BCF\u5929\u6253\u602A\u3001\u6536\u96C6\u79EF\u5206\u3001\u89E3\u9501\u5956\u52B1",
        theme_color: "#0b1026",
        background_color: "#050818",
        display: "standalone",
        orientation: "portrait",
        start_url: "/fatboy-quest/",
        scope: "/fatboy-quest/",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        navigateFallback: "/fatboy-quest/index.html"
      }
    })
  ]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvc2xlZXB5LWZ1bm55LWJyYWhtYWd1cHRhL21udC9vdXRwdXRzL2ZhdGJveS1xdWVzdFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL3Nlc3Npb25zL3NsZWVweS1mdW5ueS1icmFobWFndXB0YS9tbnQvb3V0cHV0cy9mYXRib3ktcXVlc3Qvdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL3Nlc3Npb25zL3NsZWVweS1mdW5ueS1icmFobWFndXB0YS9tbnQvb3V0cHV0cy9mYXRib3ktcXVlc3Qvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSAndml0ZS1wbHVnaW4tcHdhJztcbi8vIFx1OTBFOFx1N0Y3Mlx1NTIzMCBHaXRIdWIgUGFnZXM6IGh0dHBzOi8vcGhvZW5peHdzbC5naXRodWIuaW8vZmF0Ym95LXF1ZXN0L1xuLy8gXHU1OTgyXHU2NzlDXHU0RUQzXHU1RTkzXHU1NDBEXHU0RTBEXHU1NDBDXHVGRjBDXHU2NTM5XHU0RTBCXHU5NzYyXHU3Njg0IGJhc2VcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gICAgYmFzZTogJy9mYXRib3ktcXVlc3QvJyxcbiAgICBwbHVnaW5zOiBbXG4gICAgICAgIHJlYWN0KCksXG4gICAgICAgIFZpdGVQV0Eoe1xuICAgICAgICAgICAgcmVnaXN0ZXJUeXBlOiAnYXV0b1VwZGF0ZScsXG4gICAgICAgICAgICBpbmNsdWRlQXNzZXRzOiBbJ2Zhdmljb24uc3ZnJywgJ2ljb24tMTkyLnBuZycsICdpY29uLTUxMi5wbmcnLCAnYXBwbGUtdG91Y2gtaWNvbi5wbmcnXSxcbiAgICAgICAgICAgIG1hbmlmZXN0OiB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ1x1ODBBNVx1NEVENFx1NTkyN1x1OTVFRlx1NTE3MycsXG4gICAgICAgICAgICAgICAgc2hvcnRfbmFtZTogJ1x1ODBBNVx1NEVENFx1OTVFRlx1NTE3MycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdcdTU5MkFcdTdBN0FcdTRFM0JcdTk4OThcdTRGNUNcdTRFMUFcdTdCQTFcdTc0MDYgLSBcdTZCQ0ZcdTU5MjlcdTYyNTNcdTYwMkFcdTMwMDFcdTY1MzZcdTk2QzZcdTc5RUZcdTUyMDZcdTMwMDFcdTg5RTNcdTk1MDFcdTU5NTZcdTUyQjEnLFxuICAgICAgICAgICAgICAgIHRoZW1lX2NvbG9yOiAnIzBiMTAyNicsXG4gICAgICAgICAgICAgICAgYmFja2dyb3VuZF9jb2xvcjogJyMwNTA4MTgnLFxuICAgICAgICAgICAgICAgIGRpc3BsYXk6ICdzdGFuZGFsb25lJyxcbiAgICAgICAgICAgICAgICBvcmllbnRhdGlvbjogJ3BvcnRyYWl0JyxcbiAgICAgICAgICAgICAgICBzdGFydF91cmw6ICcvZmF0Ym95LXF1ZXN0LycsXG4gICAgICAgICAgICAgICAgc2NvcGU6ICcvZmF0Ym95LXF1ZXN0LycsXG4gICAgICAgICAgICAgICAgaWNvbnM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3JjOiAnaWNvbi0xOTIucG5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpemVzOiAnMTkyeDE5MicsXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJyxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3JjOiAnaWNvbi01MTIucG5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJyxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3JjOiAnaWNvbi01MTIucG5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHB1cnBvc2U6ICdtYXNrYWJsZScsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB3b3JrYm94OiB7XG4gICAgICAgICAgICAgICAgZ2xvYlBhdHRlcm5zOiBbJyoqLyoue2pzLGNzcyxodG1sLGljbyxwbmcsc3ZnLHdlYm1hbmlmZXN0fSddLFxuICAgICAgICAgICAgICAgIG5hdmlnYXRlRmFsbGJhY2s6ICcvZmF0Ym95LXF1ZXN0L2luZGV4Lmh0bWwnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSksXG4gICAgXSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFtVyxTQUFTLG9CQUFvQjtBQUNoWSxPQUFPLFdBQVc7QUFDbEIsU0FBUyxlQUFlO0FBR3hCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQ3hCLE1BQU07QUFBQSxFQUNOLFNBQVM7QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNKLGNBQWM7QUFBQSxNQUNkLGVBQWUsQ0FBQyxlQUFlLGdCQUFnQixnQkFBZ0Isc0JBQXNCO0FBQUEsTUFDckYsVUFBVTtBQUFBLFFBQ04sTUFBTTtBQUFBLFFBQ04sWUFBWTtBQUFBLFFBQ1osYUFBYTtBQUFBLFFBQ2IsYUFBYTtBQUFBLFFBQ2Isa0JBQWtCO0FBQUEsUUFDbEIsU0FBUztBQUFBLFFBQ1QsYUFBYTtBQUFBLFFBQ2IsV0FBVztBQUFBLFFBQ1gsT0FBTztBQUFBLFFBQ1AsT0FBTztBQUFBLFVBQ0g7QUFBQSxZQUNJLEtBQUs7QUFBQSxZQUNMLE9BQU87QUFBQSxZQUNQLE1BQU07QUFBQSxVQUNWO0FBQUEsVUFDQTtBQUFBLFlBQ0ksS0FBSztBQUFBLFlBQ0wsT0FBTztBQUFBLFlBQ1AsTUFBTTtBQUFBLFVBQ1Y7QUFBQSxVQUNBO0FBQUEsWUFDSSxLQUFLO0FBQUEsWUFDTCxPQUFPO0FBQUEsWUFDUCxNQUFNO0FBQUEsWUFDTixTQUFTO0FBQUEsVUFDYjtBQUFBLFFBQ0o7QUFBQSxNQUNKO0FBQUEsTUFDQSxTQUFTO0FBQUEsUUFDTCxjQUFjLENBQUMsNENBQTRDO0FBQUEsUUFDM0Qsa0JBQWtCO0FBQUEsTUFDdEI7QUFBQSxJQUNKLENBQUM7QUFBQSxFQUNMO0FBQ0osQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
