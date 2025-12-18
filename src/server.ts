const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // Serve index.html for root path
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const file = Bun.file("./src/index.html");
      const html = await file.text();

      // Inject hot reload script
      const hotReloadScript = `
        <script>
          const ws = new WebSocket('ws://localhost:3001');
          ws.onmessage = () => location.reload();
          ws.onclose = () => setTimeout(() => location.reload(), 1000);
        </script>
      `;
      const injectedHtml = html.replace("</body>", `${hotReloadScript}</body>`);

      return new Response(injectedHtml, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Try to serve static files from assets directory
    if (url.pathname.startsWith("/assets/")) {
      const file = Bun.file(`.${url.pathname}`);
      if (await file.exists()) {
        return new Response(file);
      }
    }

    // Try to serve static files from src directory
    const filePath = `./src${url.pathname}`;
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }

    return new Response("Not Found", { status: 404 });
  },
});

// WebSocket server for hot reload notifications
const wsServer = Bun.serve({
  port: 3001,
  fetch(req, server) {
    if (server.upgrade(req)) {
      return;
    }
    return new Response("WebSocket server", { status: 200 });
  },
  websocket: {
    open(ws) {
      ws.subscribe("reload");
    },
    message() {},
    close() {},
  },
});

// Watch for file changes
const watcher = require("fs").watch(
  "./src",
  { recursive: true },
  (event: string, filename: string) => {
    console.log(`File changed: ${filename}`);
    wsServer.publish("reload", "reload");
  }
);

console.log(`🚀 Server running at http://localhost:${server.port}`);
console.log(`👀 Watching for file changes in ./src`);

process.on("SIGINT", () => {
  watcher.close();
  process.exit(0);
});
