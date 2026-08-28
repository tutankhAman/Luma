/* Client-side CSV/JSON blob download for already-fetched data. */

const CSV_SPECIAL_CHARS = /[",\n\r]/;

function escapeCsvCell(value: string): string {
  if (value.length > 0 && CSV_SPECIAL_CHARS.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function downloadAsCsv(
  filename: string,
  header: string[],
  rows: string[][]
): void {
  const body = [
    header.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ].join("\n");
  triggerDownload(filename, body, "text/csv");
}

export function downloadAsJson(filename: string, data: unknown): void {
  triggerDownload(filename, JSON.stringify(data, null, 2), "application/json");
}

function triggerDownload(filename: string, body: string, mime: string): void {
  const blob = new Blob([body], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
