import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { unlink, writeFile } from "fs";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createClassifier } from "../classifier";
const app = new Hono();
app.use("/*", cors());

app.use("/*", serveStatic({ root: "./dist" }));
app.post("/api/scan", async (c) => {
  const body = await c.req.parseBody();

  if (!body.report) return c.json({ error: "No report attached" }, 400);

  if (!(body.report instanceof Blob))
    return c.json({ error: "Report must be a file" }, 400);

  const bytes = await body.report.arrayBuffer();
  const buffer = Buffer.from(bytes);

  try {
    writeFile("./report.pdf", buffer, (err) => {
      if (err) throw new Error("Failed to save report");
    });
  } catch (err) {
    return c.json({ error: "Failed to save report" }, 500);
  }

  const classifier = createClassifier();

  const parser = await classifier
    .classify("./report.pdf")
    .catch((err) => console.log(err));
  if (!parser) return c.json({ error: "Failed to classify report" }, 500);

  // TODO: Do manual try catch not .catch
  const data = await parser("./report.pdf").catch(console.log);
  if (!data) return c.json({ error: "Failed to parse report" }, 500);

  unlink("./report.pdf", (err) => {
    if (err) console.warn("FAILED TO DELETE FILE", err);
  });

  return c.json(data, 200);
});

serve(app, console.log);
