const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const Root = __dirname;
const Port = Number(process.env.PORT) || 3000;

const MimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function SendFile(FilePath, Response) {
  fs.stat(FilePath, (StatError, Stats) => {
    if (StatError || !Stats.isFile()) {
      Response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      Response.end("Not found");
      return;
    }

    const Extension = path.extname(FilePath).toLowerCase();
    const RelativePath = path.relative(Root, FilePath).replaceAll("\\", "/");
    const IsFavicon = RelativePath === "favicon_io/favicon.ico"
      || RelativePath.startsWith("favicon_io/")
      || RelativePath === "favicon.ico";

    Response.writeHead(200, {
      "Content-Type": MimeTypes[Extension] || "application/octet-stream",
      "Cache-Control": IsFavicon
        ? "no-store, no-cache, must-revalidate, max-age=0"
        : Extension === ".html"
          ? "no-cache"
          : "public, max-age=3600",
      ...(IsFavicon ? { "Pragma": "no-cache", "Expires": "0" } : {})
    });

    fs.createReadStream(FilePath).pipe(Response);
  });
}

const Server = http.createServer((Request, Response) => {
  let Pathname;

  try {
    Pathname = decodeURIComponent(new URL(Request.url, `http://${Request.headers.host || "localhost"}`).pathname);
  } catch {
    Response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    Response.end("Bad request");
    return;
  }

  if (Pathname === "/") Pathname = "/index.html";
  if (Pathname === "/favicon.ico") Pathname = "/favicon_io/favicon.ico";

  const FilePath = path.resolve(Root, `.${Pathname}`);
  const RootPrefix = Root.endsWith(path.sep) ? Root : Root + path.sep;

  if (FilePath !== Root && !FilePath.startsWith(RootPrefix)) {
    Response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    Response.end("Forbidden");
    return;
  }

  SendFile(FilePath, Response);
});

Server.listen(Port, "0.0.0.0", () => {
  console.log(`DON'T LOOK BEHIND YOU server listening on port ${Port}`);
});
