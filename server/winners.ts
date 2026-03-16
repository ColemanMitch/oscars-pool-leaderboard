import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WINNERS_PATH = join(__dirname, "..", "winners.json");

let winnersCache: Record<string, string[]> = {};

function loadFromDisk(): Record<string, string[]> {
  try {
    const data = readFileSync(WINNERS_PATH, "utf-8");
    const raw = JSON.parse(data);
    // Migrate legacy string values to string[]
    const result: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(raw)) {
      result[key] = Array.isArray(value) ? (value as string[]) : [value as string];
    }
    return result;
  } catch {
    return {};
  }
}

function saveToDisk(winners: Record<string, string[]>) {
  writeFileSync(WINNERS_PATH, JSON.stringify(winners, null, 2));
}

// Initialize from disk
winnersCache = loadFromDisk();

export function getWinners(): Record<string, string[]> {
  return { ...winnersCache };
}

export function setWinner(category: string, winner: string) {
  winnersCache[category] = [winner];
  saveToDisk(winnersCache);
}

export function addTiedWinner(category: string, winner: string) {
  if (!winnersCache[category]) {
    winnersCache[category] = [winner];
  } else if (!winnersCache[category].includes(winner)) {
    winnersCache[category] = [...winnersCache[category], winner];
  }
  saveToDisk(winnersCache);
}

export function removeWinner(category: string) {
  delete winnersCache[category];
  saveToDisk(winnersCache);
}
