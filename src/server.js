import express from "express";
import { renderPage } from "./render.js";

export function createApp(apiUrl = process.env.API_URL || "http://localhost:3000") {
  const app = express();
  app.use(express.urlencoded({ extended: false }));

  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.get("/", async (_request, response) => {
    try {
      const apiResponse = await fetch(`${apiUrl}/api/items`);
      if (!apiResponse.ok) {
        throw new Error(`La API respondio ${apiResponse.status}`);
      }
      response.send(renderPage(await apiResponse.json()));
    } catch (error) {
      response.status(502).send(renderPage([], `No se pudo conectar con la API: ${error.message}`));
    }
  });

  app.post("/items", async (request, response) => {
    try {
      const apiResponse = await fetch(`${apiUrl}/api/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: request.body.name })
      });
      if (!apiResponse.ok) {
        const body = await apiResponse.json();
        response.status(apiResponse.status).send(renderPage([], body.error));
        return;
      }
      response.redirect(303, "/");
    } catch (error) {
      response.status(502).send(renderPage([], `No se pudo conectar con la API: ${error.message}`));
    }
  });

  app.post("/items/:id/delete", async (request, response) => {
    try {
      await fetch(`${apiUrl}/api/items/${Number(request.params.id)}`, { method: "DELETE" });
      response.redirect(303, "/");
    } catch (error) {
      response.status(502).send(renderPage([], `No se pudo conectar con la API: ${error.message}`));
    }
  });

  return app;
}

export function startServer(port = process.env.PORT || 3000) {
  return createApp().listen(port);
}

const executedDirectly = process.argv[1] &&
  process.argv[1].endsWith("server.js");

if (executedDirectly) {
  startServer();
}
