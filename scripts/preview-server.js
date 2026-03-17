#!/usr/bin/env node
/**
 * OpenClaw Project Preview Server
 *
 * Serves static files from ~/Documents/OpenClawData/projects/
 * for remote preview via Tailscale.
 *
 * URL convention:
 *   http://<tailscale-ip>:18900/
 *   http://<tailscale-ip>:18900/<projectId>/prototype/low-fi/
 *   http://<tailscale-ip>:18900/<projectId>/prototype/high-fi/
 *   http://<tailscale-ip>:18900/<projectId>/docs/design/
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const PORT = parseInt(process.env.OPENCLAW_PREVIEW_PORT || "18900", 10);
const PROJECTS_ROOT = path.join(
  os.homedir(),
  "Documents",
  "OpenClawData",
  "projects"
);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".pdf": "application/pdf",
  ".md": "text/markdown; charset=utf-8",
};

function getMime(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

/**
 * Build an HTML index page for a directory.
 */
function renderIndex(dirPath, urlPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const rows = entries
    .filter((e) => !e.name.startsWith("."))
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    })
    .map((e) => {
      const icon = e.isDirectory() ? "&#128193;" : "&#128196;";
      const href = urlPath + e.name + (e.isDirectory() ? "/" : "");
      return `<tr><td>${icon}</td><td><a href="${href}">${e.name}${e.isDirectory() ? "/" : ""}</a></td></tr>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Index of ${urlPath}</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #333; }
  h1 { font-size: 1.4em; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 6px 8px; }
  a { text-decoration: none; color: #0366d6; }
  a:hover { text-decoration: underline; }
  .back { margin-bottom: 16px; display: block; }
</style>
</head><body>
<h1>Index of ${urlPath}</h1>
${urlPath !== "/" ? `<a class="back" href="${path.dirname(urlPath.slice(0, -1))}/">&#8592; Parent</a>` : ""}
<table>${rows}</table>
<hr><small>OpenClaw Preview Server</small>
</body></html>`;
}

/**
 * Build the portal page listing all projects with quick links.
 */
function renderPortal() {
  let projects = [];
  try {
    projects = fs
      .readdirSync(PROJECTS_ROOT, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("."));
  } catch {}

  const cards = projects
    .map((p) => {
      const protoDir = path.join(PROJECTS_ROOT, p.name, "prototype");
      const designDir = path.join(PROJECTS_ROOT, p.name, "docs", "design");
      const links = [];

      if (fs.existsSync(path.join(protoDir, "low-fi"))) {
        links.push(`<a href="/${p.name}/prototype/low-fi/">Low-fi Prototype</a>`);
      }
      if (fs.existsSync(path.join(protoDir, "high-fi"))) {
        links.push(`<a href="/${p.name}/prototype/high-fi/">High-fi Prototype</a>`);
      }
      if (fs.existsSync(designDir)) {
        links.push(`<a href="/${p.name}/docs/design/">Design Docs</a>`);
      }
      links.push(`<a href="/${p.name}/">Browse All</a>`);

      return `<div class="card">
        <h2>${p.name}</h2>
        <div class="links">${links.join(" &middot; ")}</div>
      </div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>OpenClaw Project Preview</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #333; }
  h1 { font-size: 1.6em; }
  .card { border: 1px solid #e1e4e8; border-radius: 8px; padding: 16px 20px; margin-bottom: 12px; }
  .card h2 { margin: 0 0 8px; font-size: 1.2em; }
  .links a { color: #0366d6; text-decoration: none; margin-right: 4px; }
  .links a:hover { text-decoration: underline; }
  small { color: #888; }
</style>
</head><body>
<h1>OpenClaw Project Preview</h1>
<p><small>Serving from ${PROJECTS_ROOT}</small></p>
${cards || "<p>No projects found.</p>"}
</body></html>`;
}

/**
 * Render a Markdown file as rich HTML.
 * Markdown parsing is done server-side with marked (no CDN dependency).
 * Mermaid diagrams are rendered client-side via CDN.
 */
const { marked, Renderer } = require("marked");

const mdRenderer = new Renderer();
const origCode = mdRenderer.code.bind(mdRenderer);
mdRenderer.code = function(code, lang) {
  if (typeof code === "object") { lang = code.lang; code = code.text; }
  if (lang === "mermaid") {
    return '<div class="mermaid">' + code + "</div>";
  }
  const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return '<pre><code class="language-' + (lang || "") + '">' + escaped + "</code></pre>";
};
marked.setOptions({ renderer: mdRenderer, gfm: true, breaks: false });

function renderMarkdown(filePath, urlPath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const fileName = path.basename(filePath);
  const htmlBody = marked.parse(raw);

  const breadcrumb = urlPath.split("/").filter(Boolean).map((seg, i, arr) => {
    const href = "/" + arr.slice(0, i + 1).join("/") + (i < arr.length - 1 ? "/" : "");
    return ' / <a href="' + href + '">' + seg + "</a>";
  }).join("");

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${fileName}</title>
<style>
  body {
    max-width: 900px;
    margin: 0 auto;
    padding: 20px 32px 60px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    color: #1f2328;
    background: #fff;
    line-height: 1.6;
  }
  .breadcrumb {
    font-size: 0.85em;
    color: #656d76;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #d0d7de;
  }
  .breadcrumb a { color: #0969da; text-decoration: none; }
  .breadcrumb a:hover { text-decoration: underline; }
  h1 { font-size: 2em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
  h2 { font-size: 1.5em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; margin-top: 1.5em; }
  h3 { font-size: 1.25em; margin-top: 1.5em; }
  table { border-collapse: collapse; width: auto; margin: 16px 0; }
  th, td { border: 1px solid #d0d7de; padding: 6px 13px; }
  th { background: #f6f8fa; font-weight: 600; }
  pre { background: #f6f8fa; border-radius: 6px; padding: 16px; overflow-x: auto; font-size: 0.9em; line-height: 1.45; }
  code { font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace; font-size: 0.9em; }
  :not(pre) > code { background: rgba(175,184,193,0.2); padding: 0.2em 0.4em; border-radius: 3px; }
  blockquote { margin: 16px 0; padding: 0 1em; color: #636c76; border-left: 0.25em solid #d0d7de; }
  img { max-width: 100%; }
  a { color: #0969da; text-decoration: none; }
  a:hover { text-decoration: underline; }
  ul, ol { padding-left: 2em; }
  li { margin: 4px 0; }
  input[type="checkbox"] { margin-right: 0.5em; }
  hr { border: none; border-top: 1px solid #d0d7de; margin: 24px 0; }
  .mermaid { text-align: center; margin: 16px 0; }
</style>
</head><body>
<div class="breadcrumb"><a href="/">Projects</a>${breadcrumb}</div>
<div id="content">${htmlBody}</div>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script>
if (document.querySelector('.mermaid')) {
  mermaid.initialize({ startOnLoad: true, theme: 'default' });
}
</script>
</body></html>`;
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);

  // Portal page
  if (urlPath === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderPortal());
    return;
  }

  // Prevent path traversal
  const resolved = path.resolve(PROJECTS_ROOT, "." + urlPath);
  if (!resolved.startsWith(PROJECTS_ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  // Skip hidden files/dirs
  const relParts = path.relative(PROJECTS_ROOT, resolved).split(path.sep);
  if (relParts.some((p) => p.startsWith("."))) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const stat = fs.statSync(resolved);

    if (stat.isDirectory()) {
      // Try index.html first
      const indexFile = path.join(resolved, "index.html");
      if (fs.existsSync(indexFile)) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(fs.readFileSync(indexFile));
        return;
      }
      // Directory listing
      const trailing = urlPath.endsWith("/") ? urlPath : urlPath + "/";
      if (!urlPath.endsWith("/")) {
        res.writeHead(301, { Location: urlPath + "/" });
        res.end();
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(renderIndex(resolved, trailing));
      return;
    }

    // Render Markdown as rich HTML
    if (path.extname(resolved).toLowerCase() === ".md") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(renderMarkdown(resolved, urlPath));
      return;
    }

    // Serve file
    res.writeHead(200, { "Content-Type": getMime(resolved) });
    fs.createReadStream(resolved).pipe(res);
  } catch (err) {
    if (err.code === "ENOENT") {
      res.writeHead(404);
      res.end("Not Found");
    } else {
      res.writeHead(500);
      res.end("Internal Server Error");
    }
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`OpenClaw Preview Server listening on http://0.0.0.0:${PORT}`);
  console.log(`Projects root: ${PROJECTS_ROOT}`);
});
