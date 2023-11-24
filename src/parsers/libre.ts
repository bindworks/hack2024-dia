import { ParsedData } from ".";
import { isNumeric, pdfToText, stringToNum } from "../utils";
import { months } from "./constants";

export const regexes = {
  pctTimeVeryBig:
    /(?:(?:Velmi\s+vysoká\s+hladina)|(?:Very\s+High\s+.+))\s+(\d+)%/,
  pctTimeBig: /(?:(?:Vysoká\s+hladina)|(?:High\s+.+))\s+(\d+)%/,
  pctTimeFinish: /(?:(?:Cílové rozmezí)|(?:Target Range\s+.+))\s+(\d+)%/,
  pctTimeLow: /(?:(?:Nízká\s+hladina)|(?:Low\s+.+))\s+(\d+)%/,
  pctTimeVeryLow: /(?:(?:Velmi\s+nízká\s+hladina)|(?:Very Low\s+.+))\s+(\d+)%/,
  avgGlucose:
    /(?:(?:Průměrná hodnota koncentrace glukózy)|(?:Average Glucose))\s+([\d,]+) mmol\/l/,
  glucoseStd:
    /(?:(?:Variabilita hladin glukózy)|(?:Glucose Variability))\s+([\d,.]+)%/,
  date: /AGP (?:r|R)eport\s+(\d+|.+) (\d+|.+),? 202(?:\d) - (\d+|.+) (\d+|.+),? 202(?:\d) \(/m,
  timeActive:
    /(?:(?:Doba aktivního senzoru:)|(?:Time CGM Active:))\s+([\d.,]+)%/,
  gmi: /\(GMI\)\s+([\d.,]+)%/g,
};

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
  const [startDayOrMonth, startMonthOrDay, endDayOrMonth, endMonthOrDay] =
    regexes.date.exec(data)?.slice(1) ?? [];

  const startDay = isNumeric(startDayOrMonth)
    ? startDayOrMonth
    : startMonthOrDay;
  const startMonth = isNumeric(startDayOrMonth)
    ? startMonthOrDay
    : startDayOrMonth;
  const endDay = isNumeric(endDayOrMonth) ? endDayOrMonth : endMonthOrDay;
  const endMonth = isNumeric(endDayOrMonth) ? endMonthOrDay : endDayOrMonth;
  const timeActive = stringToNum(regexes.timeActive.exec(data)?.[1]);

  [startDay, startMonth, endDay, endMonth].forEach((x) => {
    if (!x) {
      throw new Error("Undefined date");
    }

    if (!months[startMonth] || !months[endMonth]) {
      throw new Error("Unknown month");
    }
  });

  const periodStart = new Date(2023, months[startMonth], parseInt(startDay));
  const periodEnd = new Date(2023, months[endMonth], parseInt(endDay));
  const glucoseStd = stringToNum(regexes.glucoseStd.exec(data)?.[1]);
  const variationCoefficient = stringToNum(regexes.gmi.exec(data)?.[1]);
  const gmi = stringToNum(regexes.gmi.exec(data)?.[1]);

  return {
    timeInRangeVeryHigh,
    timeInRangeHigh,
    timeInRangeNormal,
    timeInRangeLow,
    timeInRangeVeryLow,
    averageGlucose: avgGlucose,
    periodStart,
    periodEnd,
    stddevGlucose: glucoseStd,
    timeActive,
    gmi,
    variationCoefficient,
  };
}
