import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import { JSDOM } from "jsdom";
import type { Season } from "../src/domain/types";
import { buildSjsuDatasetFromHtmlFiles } from "../src/importers/sjsu/dataset";

const DEFAULT_INPUT_PATH = "data/raw/sjsu";
const DEFAULT_OUTPUT_PATH = "src/data/sjsu-sample-dataset.json";
const seasons = new Set<Season>(["spring", "summer", "fall", "winter"]);

interface ParsedArgs {
  inputPaths: string[];
  outputPath: string;
}

/**
 * Imports saved SJSU schedule HTML files into the static dataset consumed by the app.
 */
function main(): void {
  installDomParser();

  const args = parseArgs(process.argv.slice(2));
  const htmlPaths = resolveHtmlPaths(args.inputPaths);

  const files = htmlPaths.map((filePath) => ({
    filePath,
    html: readFileSync(filePath, "utf8"),
    term: parseTermFromFilename(filePath),
  }));

  const dataset = buildSjsuDatasetFromHtmlFiles(files);
  const outputPath = resolve(args.outputPath);

  writeFileSync(outputPath, `${JSON.stringify(dataset, null, 2)}\n`);

  console.log(
    `Imported ${files.length} SJSU schedule file(s) into ${relative(process.cwd(), outputPath)}: ` +
      `${dataset.terms.length} terms, ${dataset.courses.length} courses, ${dataset.sections.length} sections, ` +
      `${dataset.instructors.length} instructors.`,
  );
}

function installDomParser(): void {
  const dom = new JSDOM("");
  globalThis.DOMParser = dom.window.DOMParser;
}

function parseArgs(args: string[]): ParsedArgs {
  const inputPaths: string[] = [];
  let outputPath = DEFAULT_OUTPUT_PATH;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--out") {
      const value = args[index + 1];

      if (!value) {
        throw new Error("Expected an output path after --out.");
      }

      outputPath = value;
      index += 1;
      continue;
    }

    inputPaths.push(arg);
  }

  return {
    inputPaths: inputPaths.length > 0 ? inputPaths : [DEFAULT_INPUT_PATH],
    outputPath,
  };
}

function resolveHtmlPaths(inputPaths: string[]): string[] {
  const htmlPaths = inputPaths.flatMap((inputPath) => {
    const resolvedPath = resolve(inputPath);

    if (!existsSync(resolvedPath)) {
      throw new Error(`SJSU import path does not exist: ${inputPath}`);
    }

    if (statSync(resolvedPath).isDirectory()) {
      return readdirSync(resolvedPath)
        .filter((entry) => [".html", ".htm"].includes(extname(entry).toLowerCase()))
        .map((entry) => join(resolvedPath, entry));
    }

    if (![".html", ".htm"].includes(extname(resolvedPath).toLowerCase())) {
      throw new Error(`Expected an HTML file or directory, received: ${inputPath}`);
    }

    return [resolvedPath];
  });

  if (htmlPaths.length === 0) {
    throw new Error(`No .html files found. Add saved SJSU schedule pages to ${DEFAULT_INPUT_PATH}.`);
  }

  return htmlPaths.sort((left, right) => left.localeCompare(right));
}

function parseTermFromFilename(filePath: string): { year: number; season: Season } {
  const name = basename(filePath, extname(filePath)).toLowerCase();
  const match = name.match(/^(?:(spring|summer|fall|winter)[-_ ]?(\d{4})|(\d{4})[-_ ]?(spring|summer|fall|winter))$/);

  if (!match) {
    throw new Error(
      `Could not derive SJSU term from ${basename(filePath)}. Use filenames like fall-2025.html or 2025-fall.html.`,
    );
  }

  const season = match[1] ?? match[4];
  const year = Number(match[2] ?? match[3]);

  if (!seasons.has(season as Season) || !Number.isInteger(year)) {
    throw new Error(`Invalid SJSU term filename: ${basename(filePath)}.`);
  }

  return { year, season: season as Season };
}

main();
