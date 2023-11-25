import { exec } from "child_process";
import * as fs from "fs";
import * as papaparse from "papaparse";
import * as tmp from "tmp";

export interface ExecuteOutput {
  stdout: string;
  stderr: string;
}

export async function execute(command: string): Promise<ExecuteOutput> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

export interface PdfToTextSettings {
  layout?: boolean;
  tsv?: boolean;
  raw?: boolean;
  firstPage?: boolean;
  startPage?: number;
  endPage?: number;
}

export interface PdfTsvRecord {
  level: number;
  page_num: number;
  par_num: number;
  block_num: number;
  line_num: number;
  word_num: number;
  left: number;
  top: number;
  width: number;
  height: number;
  conf: number;
  text: string;
}

export async function pdfToTsv(
  pdfPath: string,
  settings?: PdfToTextSettings
): Promise<PdfTsvRecord[]> {
  const pdfTsvText = await pdfToText(pdfPath, { ...settings, tsv: true });
  const pdfTsv = papaparse.parse<PdfTsvRecord>(pdfTsvText, {
    header: true,
    transform: (value, field) => (field === "text" ? value : parseFloat(value)),
  });
  return pdfTsv.data;
}

export const isNumeric = (n?: string) =>
  typeof n !== "undefined" && !isNaN(parseFloat(n)) && isFinite(+n);

export const percentToGMI = (percent: number) => (percent - 2.152) / 0.09148;
export const mmolToPercentGMI = (mmol: number) => 0.09148 * mmol + 2.152;

export async function pdfToText(
  pdfPath: string,
  settings?: PdfToTextSettings
): Promise<string> {
  const command = ["pdftotext"];
  if (settings?.layout) {
    command.push("-layout");
  }

  if (settings?.tsv) {
    command.push("-tsv");
  }

  if (settings?.raw) {
    command.push("-raw");
  }

  if (settings?.firstPage) {
    command.push("-f 1");
    command.push("-l 1");
  }

  if (settings?.startPage) {
    command.push(`-f ${settings.startPage}`);
  }

  if (settings?.endPage) {
    command.push(`-l ${settings.endPage}`);
  }

  command.push(`"${pdfPath}"`);
  command.push(`-`);

  const out = await execute(command.join(" "));
  return out.stdout;
}

export async function pdfToRgb(
  pdfPath: string,
  resolution: number,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<number[][]> {
  return await withTemporaryFile(async (tmpFile) => {
    await execute(
      `pdftoppm -r ${resolution} -x ${x} -y ${y} -W ${width} -H ${height} -singlefile "${pdfPath}" "${tmpFile}"`
    );
    const pixels = parsePpm(`${tmpFile}.ppm`);
    fs.unlinkSync(`${tmpFile}.ppm`);
    return pixels;
  });
}

export function parsePpm(ppmPath: string): number[][] {
  var bf, i, tmp, x, y, _ref;
  bf = fs.readFileSync(ppmPath);
  i = 0;
  if (bf[i] !== 0x50 || bf[++i] !== 0x36) {
    throw new Error("Not P6 PPM");
  }
  i++;
  tmp = "";
  while (bf[++i] !== 0x0a) {
    tmp += String.fromCharCode(bf[i]);
  }
  (_ref = tmp.split(" ")), (x = _ref[0]), (y = _ref[1]);
  x = Number(x);
  y = Number(y);
  tmp = "";
  while (bf[++i] !== 0x0a) {
    tmp += String.fromCharCode(bf[i]);
  }
  if (255 !== Number(tmp)) {
    throw new Error("Not P6 PPM");
  }
  bf = bf.slice(i + 1);
  const output: number[][] = [];
  i = 0;
  while (i < x * y) {
    const r = bf[i * 3];
    const g = bf[i * 3 + 1];
    const b = bf[i * 3 + 2];
    output.push([r, g, b]);
    i++;
  }
  return output;
}

export async function withTemporaryFile<T>(
  fn: (path: string) => Promise<T>,
  options?: tmp.FileOptions
): Promise<T> {
  const temporaryFile = await new Promise<{
    path: string;
    cleanupCallback: () => void;
  }>((resolve, reject) => {
    tmp.file(
      { mode: 0o600, prefix: "hobit-", ...options },
      (err, path, _fd, cleanupCallback) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({ path, cleanupCallback });
      }
    );
  });

  try {
    return await fn(temporaryFile.path);
  } finally {
    temporaryFile.cleanupCallback();
  }
}

export const stringToNum = (str: string | undefined, message = "") => {
  if (str) {
    if (str.includes(",") || str.includes(".")) {
      return parseFloat(str.replace(",", "."));
    }
    return parseInt(str);
  }
  throw new Error(`stringToNum: str (${message}) is undefined`);
};

export function findInText(
  text: string,
  regex: RegExp,
  assign: (res: RegExpExecArray) => void
) {
  const match = regex.exec(text);
  if (!match) {
    throw new Error("No match");
  }
  assign(match);
}

export function doThrow(c: () => Error): never {
  throw c();
}

export function findMissingProperties<T extends object>(
  obj: T
): string | undefined {
  const missingProperties = Object.entries(obj)
    .map(([key, value]) => {
      return value === undefined ? key : "";
    })
    .filter((x) => x !== "")
    .join(", ");

  return missingProperties !== ""
    ? `Missing properties: ${missingProperties}`
    : undefined;
}
