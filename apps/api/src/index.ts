import { createApp } from "./app.js";

const parsedPort = Number(process.env.PORT ?? 4000);
const port =
  Number.isInteger(parsedPort) && parsedPort >= 1 && parsedPort <= 65_535
    ? parsedPort
    : 4000;

createApp().listen(port, () => {
  process.stdout.write(`api listening on http://localhost:${port}\n`);
});
