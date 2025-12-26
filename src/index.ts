import { Elysia } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import { watch } from "fs";
import sendStreamCppRequest from "./streamCpp";

const hotReloadScript = `
<script>
  const ws = new WebSocket('ws://localhost:5124/ws');
  ws.onmessage = () => location.reload();
  ws.onclose = () => setTimeout(() => location.reload(), 1000);
</script>
`;

const clients = new Set<any>();

const app = new Elysia()
  .use(staticPlugin({ assets: "assets", prefix: "/assets" }))
  .get("/", async () => {
    const file = Bun.file("./src/index.html");
    const html = await file.text();
    const injectedHtml = html.replace("</body>", `${hotReloadScript}</body>`);
    return new Response(injectedHtml, {
      headers: { "Content-Type": "text/html" },
    });
  })
  .get("/streamCpp", async () => {
    const streamCpp = await sendStreamCppRequest();
    return new Response(streamCpp, {
      headers: { "Content-Type": "application/json" },
    });
  })
  .get("/test", async () => {
    const time = Date.now();
    return new Response(`Hello World ${time}`, {
      headers: { "Content-Type": "text/html" },
    });
  })
  .ws("/ws", {
    open(ws) {
      clients.add(ws);
    },
    close(ws) {
      clients.delete(ws);
    },
    message() {},
  })
  .listen(5124);

// Watch for file changes
const watcher = watch("./src", { recursive: true }, (event, filename) => {
  console.log(`File changed: ${filename}`);
  clients.forEach((ws) => ws.send("reload"));
});

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);
console.log(`👀 Watching for file changes in ./src`);

process.on("SIGINT", () => {
  watcher.close();
  process.exit(0);
});
