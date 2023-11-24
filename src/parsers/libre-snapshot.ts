import { ParsedData } from ".";
import { pdfToText, stringToNum } from "../utils";
import { regexes } from "./libre";

export async function libreSnapshotParser(
  pdfPath: string
): Promise<ParsedData> {
  const data = await pdfToText(pdfPath, { layout: true });

  const avgGlucose = stringToNum(regexes.avgGlucose.exec(data)?.[1]);

  return { averageGlucose: avgGlucose };
}
