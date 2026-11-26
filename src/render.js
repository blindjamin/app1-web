export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderPage(items, error) {
  const rows = items.length
    ? items
        .map(
          (item) =>
            `<li>${escapeHtml(item.name)}
              <form method="post" action="/items/${Number(item.id)}/delete"><button>Eliminar</button></form>
            </li>`
        )
        .join("")
    : "<li>No hay items</li>";

  const errorBlock = error ? `<p class="error">${escapeHtml(error)}</p>` : "";

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>App1 Web</title>
  <style>
    body { font-family: sans-serif; max-width: 40rem; margin: 2rem auto; }
    li { display: flex; gap: 1rem; align-items: center; margin: .3rem 0; }
    .error { color: #b00020; }
  </style>
</head>
<body>
  <h1>Items</h1>
  ${errorBlock}
  <form method="post" action="/items">
    <input name="name" placeholder="Nuevo item" required>
    <button>Agregar</button>
  </form>
  <ul>${rows}</ul>
</body>
</html>`;
}
