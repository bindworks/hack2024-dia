import { serve } from "@hono/node-server";
import { unlink, writeFile } from "fs";
import { Hono } from "hono";
import { createClassifier } from "../classifier";
const app = new Hono();

app.post("/", async (c) => {
  const body = await c.req.parseBody();
  console.log(body);

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

  const data = await parser("./report.pdf").catch(console.log);
  if (!data) return c.json({ error: "Failed to parse report" }, 500);

  unlink("./report.pdf", (err) => {
    if (err) console.warn("FAILED TO DELETE FILE", err);
  });

  return c.json(data, 200);
});

serve(app, console.log);
