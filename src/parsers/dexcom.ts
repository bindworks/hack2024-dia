import { ParsedData } from ".";
import { pdfToText } from "../utils";

const monthShortcuts = {
  cz: new Map([
    ["led", 0],
    ["úno", 1],
    ["bře", 2],
    ["dub", 3],
    ["kvě", 4],
    ["čvn", 5],
    ["čvc", 6],
    ["srp", 7],
    ["zář", 8],
    ["říj", 9],
    ["lis", 10],
    ["pro", 11],
  ]),
};

const dexcomRegexes = {
  date: /\S{2}\s*(\d+).\s*(\S{3})\s*(\d{4})/gm,
  patientNameAndTimeFrame:
    /(?:Přehled|Súhrn|Overview)\s*(\d+)\s*(?:dny\/dní|dní|days)\s*\|\s*((?:\S{2}\s*\d+\.\s*\S{3}\s*\d{4})|(?:\S{3}\s*\S{3}\s*\d{1,2},\s*\d{4}))\s*-\s*((?:\S{2}\s*\d+\.\s*\S{3}\s*\d{4})|(?:\S{3}\s*\S{3}\s*\d{1,2},\s*\d{4}))\s*(\S+\s*\S+)/gm,
  timeAtCGM:
    /(?:Dny|Dni|Days)\s*(?:s|with)\s(?:(?:(?:daty|údajmi)\s*CGM)|(?:CGM\s*data))\s*(\d+(?:,\d+)?)\s*%/gm,
  glucoseAvg:
    /(?:Průměrná|Priemerná|Average)\s*(?:Glukóza|Glucose)\s*(\d+(?:(?:,|.)\d+)?)\s*mmol\/L/gm,
  glucoseStdvec:
    /(?:Směrodatná|Smerodajná|Standard)\s*(?:Odchylka|Odchýlka|Deviation)\s*(\d+(?:(?:,|.)\d+)?)\s*mmol\/L/gm,
  GMI: /GMI\s*(\d+(?:(?:,|.)\d+)?)\s*%/gm,
  timeInRange: {
    veryHigh:
      /(?:Čas|Doba|Time)\s*(?:v|in)\s*(?:rozmezí|rozsahu|Range)\s*<?(\d+(?:(?:,|.)\d+)?)\s*%\s*(?:Velmi|Veľmi|Very)\s*(?:Vysoký|Vysoké|High)/gm,
    high: /(?:Velmi|Veľmi|Very)\s*(?:Vysoký|Vysoké|High)\s*<?(\d+(?:(?:,|.)\d+)?)\s*%\s*(?:Vysoký|Vysoké|High)/gm,
    moderate:
      /(?:Vysoký|Vysoké|High)\s*<?(\d+(?:(?:,|.)\d+)?)\s*%\s*(?:V|In)\s*(?:Rozmezí|Rozsahu|Range)/gm,
    low: /(?:Rozmezí|Rozsahu|Range)\s*<?(\d+(?:(?:,|.)\d+)?)\s*%\s*(?:Nízká|Nízke|Low)/gm,
    veryLow:
      /(?:Nízká|Nízke|Low)\s*<?(\d+(?:(?:,|.)\d+)?)\s*%\s*(?:Velmi|Veľmi|Very)\s*(?:Nízký|Nízke|Low)/gm,
  },
};

const parseDate = (date: string): Date => {
  const dateParsed = dexcomRegexes.date.exec(date);
  const dateYear = dateParsed?.[3];
  const dateMonth = dateParsed?.[2];
  const dateDay = dateParsed?.[1];

  if (!dateYear || !dateMonth || !dateDay) {
    throw new Error("Could not parse Dexcom PDF Date");
  }

  const dateMonthValue = monthShortcuts.cz.get(dateMonth);

  if (!dateMonthValue) {
    throw new Error("Could not parse Dexcom PDF Date Month");
  }

  const dateDate = new Date(
    parseInt(dateYear),
    dateMonthValue,
    parseInt(dateDay)
  );

  return dateDate;
};

export async function dexcomParser(pdfPath: string): Promise<ParsedData> {
  const data = await pdfToText(pdfPath, { raw: true });

  const patientNameAndTimeFrame =
    dexcomRegexes.patientNameAndTimeFrame.exec(data);

  const timeFrame = patientNameAndTimeFrame?.[1];
  const timeFrameStart = patientNameAndTimeFrame?.[2];
  const timeFrameEnd = patientNameAndTimeFrame?.[3];
  const patientName = patientNameAndTimeFrame?.[4];

  const timeAtCGM = dexcomRegexes.timeAtCGM.exec(data)?.[1];
  const glucoseAvg = dexcomRegexes.glucoseAvg.exec(data)?.[1];
  const glucoseStdvec = dexcomRegexes.glucoseStdvec.exec(data)?.[1];
  const GMI = dexcomRegexes.GMI.exec(data)?.[1];
  const timeInRange = {
    veryHigh: dexcomRegexes.timeInRange.veryHigh.exec(data)?.[1],
    high: dexcomRegexes.timeInRange.high.exec(data)?.[1],
    moderate: dexcomRegexes.timeInRange.moderate.exec(data)?.[1],
    low: dexcomRegexes.timeInRange.low.exec(data)?.[1],
    veryLow: dexcomRegexes.timeInRange.veryLow.exec(data)?.[1],
  };

  if (
    !timeFrame ||
    !timeFrameStart ||
    !timeFrameEnd ||
    !patientName ||
    !timeAtCGM ||
    !glucoseAvg ||
    !glucoseStdvec ||
    !GMI ||
    !timeInRange.veryHigh ||
    !timeInRange.high ||
    !timeInRange.moderate ||
    !timeInRange.low ||
    !timeInRange.veryLow
  ) {
    throw new Error("Could not parse Dexcom PDF");
  }

  const periodStart = parseDate(timeFrameStart);
  const periodEnd = parseDate(timeFrameEnd);

  return {
    periodStart,
    periodEnd,
    timeInRangeVeryHigh: parseFloat(timeInRange.veryHigh),
    timeInRangeHigh: parseFloat(timeInRange.high),
    timeInRangeNormal: parseFloat(timeInRange.moderate),
    timeInRangeLow: parseFloat(timeInRange.low),
    timeInRangeVeryLow: parseFloat(timeInRange.veryLow),

    averageGlucose: parseFloat(glucoseAvg),
    stddevGlucose: parseFloat(glucoseStdvec),
    gmi: parseFloat(GMI),
  };
}
