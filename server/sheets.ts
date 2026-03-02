import type { NomineeColumn } from "./types.js";

const SHEET_ID =
  process.env.GOOGLE_SHEET_ID ||
  "14oGFQ60hXS7dpm3Cp_v0nue2IpVr3lE6mONdYlyTILg";
const TSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=tsv`;

// Header pattern: "Best Actor (90 points possible) [Timothée Chalamet, "Marty Supreme"]"
const HEADER_REGEX =
  /^(.+?)\s*\((\d+)\s*points?\s*possible\)\s*\[(.+)\]$/;

let cachedData: { rows: string[][]; columns: NomineeColumn[] } | null = null;
let lastFetch = 0;
const CACHE_TTL = 60_000; // 60 seconds

function parseTsv(text: string): string[][] {
  return text
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => line.split("\t"));
}

function parseHeader(header: string, index: number): NomineeColumn | null {
  const match = header.match(HEADER_REGEX);
  if (!match) return null;
  return {
    category: match[1].trim(),
    maxPoints: parseInt(match[2]),
    nominee: match[3].trim(),
    columnIndex: index,
  };
}

function parsePoints(cell: string): number {
  if (!cell || !cell.trim()) return 0;
  // "60 points, 30 points" → split → parse → sum
  const parts = cell.split(",");
  let total = 0;
  for (const part of parts) {
    const num = parseInt(part.replace(/[^\d]/g, ""));
    if (!isNaN(num)) total += num;
  }
  return total;
}

export async function fetchSheetData(): Promise<{
  rows: string[][];
  columns: NomineeColumn[];
}> {
  const now = Date.now();
  if (cachedData && now - lastFetch < CACHE_TTL) {
    return cachedData;
  }

  const res = await fetch(TSV_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet: ${res.status} ${res.statusText}`);
  }

  const tsvText = await res.text();
  const allRows = parseTsv(tsvText);

  if (allRows.length < 2) {
    throw new Error("Sheet has no data rows");
  }

  const headers = allRows[0];
  const columns: NomineeColumn[] = [];

  for (let i = 0; i < headers.length; i++) {
    const col = parseHeader(headers[i], i);
    if (col) columns.push(col);
  }

  const dataRows = allRows.slice(1);

  cachedData = { rows: dataRows, columns };
  lastFetch = now;
  return cachedData;
}

export function getCategories(columns: NomineeColumn[]) {
  const categoryMap = new Map<
    string,
    { maxPoints: number; nominees: string[] }
  >();

  for (const col of columns) {
    if (!categoryMap.has(col.category)) {
      categoryMap.set(col.category, {
        maxPoints: col.maxPoints,
        nominees: [],
      });
    }
    categoryMap.get(col.category)!.nominees.push(col.nominee);
  }

  return categoryMap;
}

export function getParticipantPicks(
  row: string[],
  columns: NomineeColumn[]
): { name: string; email: string; picks: Map<string, Map<string, number>> } {
  const name = row[2] || "Unknown";
  const email = row[1] || "";

  // category → nominee → points
  const picks = new Map<string, Map<string, number>>();

  for (const col of columns) {
    if (!picks.has(col.category)) {
      picks.set(col.category, new Map());
    }
    const points = parsePoints(row[col.columnIndex] || "");
    if (points > 0) {
      picks.get(col.category)!.set(col.nominee, points);
    }
  }

  return { name, email, picks };
}

export { parsePoints };
