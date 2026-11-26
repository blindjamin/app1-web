import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createApp } from "../src/server.js";
import { escapeHtml, renderPage } from "../src/render.js";

// Fake of app2-api so the web can be tested without the real container.
const items = [];
let nextId = 1;
const fakeApi = express();
fakeApi.use(express.json());
fakeApi.get("/api/items", (_req, res) => res.json(items));
fakeApi.post("/api/items", (req, res) => {
  if (!req.body.name) {
    res.status(400).json({ error: "El nombre es obligatorio" });
    return;
  }
  const item = { id: nextId++, name: req.body.name };
  items.push(item);
  res.status(201).json(item);
});
fakeApi.delete("/api/items/:id", (req, res) => {
  const index = items.findIndex((item) => item.id === Number(req.params.id));
  if (index !== -1) items.splice(index, 1);
  res.status(204).send();
});

let apiServer;
let webServer;
let webUrl;
let deadWebUrl;
let deadWebServer;

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

before(async () => {
  apiServer = await listen(fakeApi);
  webServer = await listen(createApp(`http://127.0.0.1:${apiServer.address().port}`));
  webUrl = `http://127.0.0.1:${webServer.address().port}`;
  // Points to a port where nothing listens, to cover the "API down" paths.
  deadWebServer = await listen(createApp("http://127.0.0.1:1"));
  deadWebUrl = `http://127.0.0.1:${deadWebServer.address().port}`;
});

after(() => {
  apiServer.close();
  webServer.close();
  deadWebServer.close();
});

function postForm(url, body) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    redirect: "manual"
  });
}

test("escapeHtml escapa caracteres peligrosos", () => {
  assert.equal(escapeHtml(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
});

test("renderPage muestra mensaje cuando no hay items", () => {
  assert.match(renderPage([]), /No hay items/);
});

test("renderPage muestra error escapado", () => {
  assert.match(renderPage([], "<falla>"), /&lt;falla&gt;/);
});

test("GET /health responde ok", async () => {
  const response = await fetch(`${webUrl}/health`);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("crear, listar y eliminar un item a traves de la API", async () => {
  const created = await postForm(`${webUrl}/items`, { name: "Comprar pan" });
  assert.equal(created.status, 303);

  const page = await (await fetch(webUrl)).text();
  assert.match(page, /Comprar pan/);

  const deleted = await postForm(`${webUrl}/items/${items[0].id}/delete`, {});
  assert.equal(deleted.status, 303);
  assert.equal(items.length, 0);
});

test("POST /items sin nombre muestra el error de la API", async () => {
  const response = await postForm(`${webUrl}/items`, { name: "" });
  assert.equal(response.status, 400);
  assert.match(await response.text(), /El nombre es obligatorio/);
});

test("GET / con la API caida responde 502", async () => {
  const response = await fetch(deadWebUrl);
  assert.equal(response.status, 502);
});

test("POST /items con la API caida responde 502", async () => {
  const response = await postForm(`${deadWebUrl}/items`, { name: "x" });
  assert.equal(response.status, 502);
});

test("eliminar con la API caida responde 502", async () => {
  const response = await postForm(`${deadWebUrl}/items/1/delete`, {});
  assert.equal(response.status, 502);
});

test("GET / cuando la API responde error muestra 502", async () => {
  const brokenApi = express();
  brokenApi.get("/api/items", (_req, res) => res.status(500).json({ error: "boom" }));
  const brokenServer = await listen(brokenApi);
  const web = await listen(createApp(`http://127.0.0.1:${brokenServer.address().port}`));
  const response = await fetch(`http://127.0.0.1:${web.address().port}`);
  assert.equal(response.status, 502);
  assert.match(await response.text(), /La API respondio 500/);
  web.close();
  brokenServer.close();
});
