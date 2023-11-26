import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { unlink, writeFile } from "fs";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createClassifier } from "../classifier";
import { postProcessData } from "../parsers";
const app = new Hono();
app.use("/*", cors());

app.use(
  "/*",
  serveStatic({
    root: "./dist",
    rewriteRequestPath(path) {
      if (path.includes(".")) return path;
      if (path.includes("api")) return path;
      return "/index.html";
    },
  })
);
app.post("/api/scan", async (c) => {
  const body = await c.req.parseBody();

  if (!body.report)
    return c.json(
      { error: "Nepodařilo se najít report, zkontrolujte že jste ho nahráli" },
      400
    );

  if (!(body.report instanceof Blob))
    return c.json({ error: "Report musí být soubor" }, 400);

  const bytes = await body.report.arrayBuffer();
  const buffer = Buffer.from(bytes);

  try {
    writeFile("./report.pdf", buffer, (err) => {
      if (err) throw new Error("Nepodařilo se uložit report");
    });
  } catch (err) {
    return c.json({ error: "Nepodařilo se uložit report" }, 500);
  }

  const classifier = createClassifier();

  const parser = await classifier
    .classify("./report.pdf")
    .catch((err) => console.log(err));
  if (!parser)
    return c.json({ error: "Tento typ reportu ještě neumíme zpracovat" }, 500);

  // TODO: Do manual try catch not .catch
  const data = await parser("./report.pdf").catch(console.log);
  if (!data)
    return c.json({ error: "Nepodařilo se vytěžit informace z reportu" }, 500);

  unlink("./report.pdf", (err) => {
    if (err) console.warn("FAILED TO DELETE FILE", err);
  });

  return c.json(postProcessData(data), 200);
});

serve(app, console.log);
