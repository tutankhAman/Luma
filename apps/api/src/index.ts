import { createApp } from "./app.js";

const parsedPort = Number(process.env.PORT ?? 4000);
const port = Number.isFinite(parsedPort) ? parsedPort : 4000;

createApp().listen(port, () => {
  process.stdout.write(`api listening on http://localhost:${port}\n`);
});
