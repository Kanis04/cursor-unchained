// src/routes/api/[...slugs]/+server.ts
import sendStreamCppRequest from "$lib/streamCpp";
import { Elysia, t } from "elysia";

const app = new Elysia({ prefix: "/api" })
  .get("/test", () => {
    const time = Date.now();
    return new Response(`hi ${time}`, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  })
  .get("/streamCpp", async () => {
    const streamCpp = await sendStreamCppRequest();
    return new Response(streamCpp, {
      headers: { "Content-Type": "application/json" },
    });
  })
  .post("/", ({ body }) => body, {
    body: t.Object({
      name: t.String(),
    }),
  });

type RequestHandler = (v: { request: Request }) => Response | Promise<Response>;

export const fallback: RequestHandler = ({ request }) => app.handle(request);
