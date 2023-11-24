import { exec } from "child_process";
import * as papaparse from "papaparse";

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
}

export interface PdfTsvRecord {
  level: number,
  page_num: number,
  par_num: number,
  block_num: number,
  line_num: number,
  word_num: number,
  left: number,
  top: number,
  width: number,
  height: number,
  conf: number,
  text: string,
}

export async function pdfToTsv(
  pdfPath: string
): Promise<PdfTsvRecord[]> {
  const pdfTsvText = await pdfToText(pdfPath, { tsv: true });
  const pdfTsv = papaparse.parse<PdfTsvRecord>(pdfTsvText, {
    header: true,
    transform: (value, field) => field === 'text' ? value : parseFloat(value),
  });
  return pdfTsv.data;
}

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

  command.push(`"${pdfPath}"`);
  command.push(`-`);

  const out = await execute(command.join(" "));
  return out.stdout;
}
