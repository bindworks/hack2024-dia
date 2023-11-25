import { ParsedData } from ".";
import { isNumeric, pdfToText, percentToGMI, stringToNum } from "../utils";
import { months } from "./constants";

export const regexes = {
  pctTimeVeryBig:
    /(?:(?:Ve[lľ]mi\s+vysoká\s+(?:hladina)?)|(?:Very\s+High\s+.+))\s+(\d+)%/,
  pctTimeBig: /(?:(?:Vysoká\s+(?:hladina)?)|(?:(?<!Very )High\s+.+))\s+(\d+)%/,
  pctTimeFinish:
    /(?:(?:Cílové rozmezí)|(?:Target Range (?:3\.9 - 10\.0 mmol\/L)?)|(?:Cieľový rozsah))\s+(\d+)%/,
  pctTimeLow: /(?:(?:Nízk[aá]\s+(?:hladina)?)|(?:Low\s+.+))\s+(\d+)%/,
  pctTimeVeryLow:
    /(?:(?:Ve[lľ]mi\s+nízk[aá]\s+(?:hladina)?)|(?:Very Low\s+.+))\s+(\d+)%/,
  avgGlucose:
    /(?:(?:Průměrná hodnota koncentrace glukózy)|(?:Average Glucose)|(?:Priemerná glukóza))\s+([\d,.]+)\s+mmol\/L/i,
  glucoseStd:
    /(?:(?:Variabilita hladin glukózy)|(?:Glucose Variability)|(?:Variabilita glukózy))\s+([\d,.]+)%/m,
  date: /(?:AGP [rR]eport|prehľad)\s+(.+) (.+),? 202(?:\d) - (.+) (.+),? 202(?:\d)/m,
  timeActive:
    /(?:Doba aktivního senzoru:|Time CGM|Sensor Active:|Čas, kedy je senzor aktívny:)\s+([\d.,]+)%/,
  gmi: /\(GMI\)\s+([\d.,]+)%/,
};

export async function libreAGPParser(pdfPath: string): Promise<ParsedData> {
  const data = (
    await pdfToText(pdfPath, {
      layout: true,
    })
  ).replace(/[\u200A-\u300F\uFEFF]/g, "");

  const timeInRangeVeryHigh = stringToNum(
    regexes.pctTimeVeryBig.exec(data)?.[1],
    "veryHigh"
  );
  const timeInRangeHigh = stringToNum(
    regexes.pctTimeBig.exec(data)?.[1],
    "timeInRange"
  );
  const timeInRangeNormal = stringToNum(
    regexes.pctTimeFinish.exec(data)?.[1],
    "timeInRangeNormal"
  );
  const timeInRangeLow = stringToNum(
    regexes.pctTimeLow.exec(data)?.[1],
    "timeInRangeLow"
  );
  const timeInRangeVeryLow = stringToNum(
    regexes.pctTimeVeryLow.exec(data)?.[1],
    "timeInRangeVeryLow"
  );

  const avgGlucoseStr = regexes.avgGlucose.exec(data)?.[1];
  const avgGlucose = stringToNum(avgGlucoseStr, "avgGlucose");
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
  const timeActive = stringToNum(
    regexes.timeActive.exec(data)?.[1],
    "timeActive"
  );

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
  const glucoseStd = stringToNum(regexes.glucoseStd.exec(data)?.[1], "stdDev");
  const stddevGlucose = avgGlucose * (glucoseStd / 100);
  const variationCoefficient = stringToNum(
    regexes.glucoseStd.exec(data)?.[1],
    "variationCoefficient"
  );
  const gmiStr = regexes.gmi.exec(data)?.[1];
  const gmi = gmiStr ? percentToGMI(stringToNum(gmiStr, "gmi")) : undefined;

  return {
    timeInRangeVeryHigh,
    timeInRangeHigh,
    timeInRangeNormal,
    timeInRangeLow,
    timeInRangeVeryLow,
    averageGlucose: avgGlucose,
    periodStart,
    periodEnd,
    stddevGlucose,
    timeActive,
    gmi,
    variationCoefficient,
  };
}
