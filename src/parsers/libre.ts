import { ParsedData } from ".";
import { pdfToText } from "../utils";

export const regexes = {
  pctTimeVeryBig: /(?:Velmi\s+vysoká\s+hladina)\s+(\d+)%/,
  pctTimeBig: /(?:Vysoká\s+hladina)\s+(\d+)%/,
  pctTimeFinish: /(?:Cílové rozmezí)\s+(\d+)%/,
  pctTimeLow: /(?:Nízká\s+hladina)\s+(\d+)%/,
  pctTimeVeryLow: /(?:Velmi\s+nízká\s+hladina)\s+(\d+)%/,
  avgGlucose: /(?:Průměrná hodnota koncentrace glukózy)\s+([\d,]+) mmol\/l/,
};

const stringToNum = (str: string | undefined) => (str ? +str : undefined);

export async function libreAGPParser(
  pdfPath: string
): Promise<Partial<ParsedData>> {
  const data = await pdfToText(pdfPath, { layout: true });

  const timeInRangeVeryHigh = stringToNum(
    regexes.pctTimeVeryBig.exec(data)?.[1]
  );
  const timeInRangeHigh = stringToNum(regexes.pctTimeBig.exec(data)?.[1]);
  const timeInRangeNormal = stringToNum(regexes.pctTimeFinish.exec(data)?.[1]);
  const timeInRangeLow = stringToNum(regexes.pctTimeLow.exec(data)?.[1]);
  const timeInRangeVeryLow = stringToNum(
    regexes.pctTimeVeryLow.exec(data)?.[1]
  );

  const avgGlucoseStr = regexes.avgGlucose.exec(data)?.[1].replace(",", ".");
  const avgGlucose = avgGlucoseStr ? parseFloat(avgGlucoseStr) : undefined;

  return {
    timeInRangeVeryHigh,
    timeInRangeHigh,
    timeInRangeNormal,
    timeInRangeLow,
    timeInRangeVeryLow,
    averageGlucose: avgGlucose,
  };
}
