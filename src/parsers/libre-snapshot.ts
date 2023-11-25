import { ParsedData } from ".";
import { pdfToText, stringToNum } from "../utils";

export const regex = {
  avgGlucose: /AVERAGE\s+GLUCOSE\s+([\d,.]+)/m,
};

export async function libreSnapshotParser(
  pdfPath: string
): Promise<ParsedData> {
  const data = await pdfToText(pdfPath, { raw: true });

  const avgGlucose = stringToNum(regex.avgGlucose.exec(data)?.[1]);

  return { averageGlucose: avgGlucose };
}
