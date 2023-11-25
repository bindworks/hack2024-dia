import { ParsedData } from ".";
import { findMissingProperties, pdfToText, percentToGMI, stringToNum } from "../utils";

const monthShortcuts = new Map([
  //CZ
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
  //SK
  ["jan", 0],
  ["feb", 1],
  ["mar", 2],
  ["apr", 3],
  ["máj", 4],
  ["jún", 5],
  ["júl", 6],
  ["aug", 7],
  ["sep", 8],
  ["okt", 9],
  ["nov", 10],
  ["dec", 11],
  //EN
  ["jan", 0],
  ["feb", 1],
  ["mar", 2],
  ["apr", 3],
  ["may", 4],
  ["jun", 5],
  ["jul", 6],
  ["aug", 7],
  ["sep", 8],
  ["oct", 9],
  ["nov", 10],
  ["dec", 11],
]);

const dexcomRegexes = {
  dateCZSK: /\S{2}\s*(\d+).\s*(\S{3})\s*(\d{4})/m,
  dateEN: /\S{3}\s*(\S{3})\s*(\d{1,2}),\s(\d{4})/m,
  patientNameAndTimeFrame:
    /(\d+)\s*(?:dny\/dní|dní|days)\s*\|\s*((?:\S{2}\s*\d+\.\s*\S{3}\s*\d{4})|(?:\S{3}\s*\S{3}\s*\d{1,2},\s*\d{4}))\s*-\s*((?:\S{2}\s*\d+\.\s*\S{3}\s*\d{4})|(?:\S{3}\s*\S{3}\s*\d{1,2},\s*\d{4}))\s*(\S+\s*\S+)/m,
  timeAtCGM:
    /(?:Dny|Dni|Days)\s*(?:s|with)\s(?:(?:(?:daty|údajmi)\s*CGM)|(?:CGM\s*data))\s*(\d+(?:,\d+)?)\s*%/m,
  timeAtCGMCapturBackup: /Doba\s*aktivního\s*CGM\s*(\d+(?:,\d+)?)\s*%/m,
  glucoseAvg:
    /(?:Průměrná|Priemerná|Average)\s*(?:[Gg](?:lukóza|lucose))\s*(\d+(?:(?:,|.)\d+)?)\s*mmol\/L/m,
  glucoseAvgCapturBackup:
    /(?:Průměrná|Priemerná|Average)\s*(?:[Gg](?:lukóza|lucose))\s*Cíl:\s*<?\s*(?:\d+(?:(?:,|.)\d+)?)\s*mmol\/L<?\s*(\d+(?:(?:,|.)\d+)?)\s*mmol\/L/m,
  glucoseStdvec:
    /(?:Směrodatná|Smerodajná|Standard)\s*(?:Odchylka|Odchýlka|Deviation)\s*(\d+(?:(?:,|.)\d+)?)\s*mmol\/L/m,
  glucoseStdvecCapturBackup:
    /Variační\s*koeficient\s*Cíl:\s*<?\s*(?:\d+(?:(?:,|.)\d+)?)\s*%\s*<?(\d+(?:(?:,|.)\d+)?)\s*%/m,
  GMI: /GMI\s*(\d+(?:(?:,|.)\d+)?)\s*%/m,
  GMICapturBackup:
    /GMI\s*Cíl:\s*<?\s*(?:\d+(?:(?:,|.)\d+)?)\s*%<?\s*(\d+(?:(?:,|.)\d+)?)\s*%/m,
  timeInRange: {
    veryHigh:
      /<?(\d+(?:(?:,|.)\d+)?)\s*%\s*(?:Velmi|Veľmi|Very)\s*(?:Vysoký|Vysoké|Vysoká|High)/m,
    high: /<?(\d+(?:(?:,|.)\d+)?)\s*%\s*(?:Vysoký|Vysoké|High)/m,
    moderate:
      /<?(\d+(?:(?:,|.)\d+)?)\s*%\s*(?:V|In)\s*(?:Rozmezí|Rozsahu|Range)/m,
    low: /<?(\d+(?:(?:,|.)\d+)?)\s*%\s*(?:Nízká|Nízke|Low)/m,
    veryLow:
      /<?(\d+(?:(?:,|.)\d+)?)\s*%\s*(?:Velmi|Veľmi|Very)\s*(?:Nízký|Nízke|Low)/m,
  },
};

const parseDate = (date: string): Date => {
  let dateParsed = dexcomRegexes.dateCZSK.exec(date);

  let dateYear = dateParsed?.[3];
  let dateMonth = dateParsed?.[2];
  let dateDay = dateParsed?.[1];

  if (!dateParsed) {
    dateParsed = dexcomRegexes.dateEN.exec(date);
    dateYear = dateParsed?.[3];
    dateDay = dateParsed?.[2];
    dateMonth = dateParsed?.[1];
  }

  if (!dateYear || !dateMonth || !dateDay) {
    throw new Error("Could not parse Dexcom PDF Date");
  }

  const dateMonthValue = monthShortcuts.get(dateMonth.toLowerCase());

  if (dateMonthValue === undefined) {
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
  const data = await pdfToText(pdfPath, { raw: true, firstPage: true });

  const patientNameAndTimeFrame =
    dexcomRegexes.patientNameAndTimeFrame.exec(data);

  const timeFrame = patientNameAndTimeFrame?.[1];
  const timeFrameStart = patientNameAndTimeFrame?.[2];
  const timeFrameEnd = patientNameAndTimeFrame?.[3];
  const patientName = patientNameAndTimeFrame?.[4];

  let timeAtCGM = dexcomRegexes.timeAtCGM.exec(data)?.[1];
  let glucoseAvg = dexcomRegexes.glucoseAvg.exec(data)?.[1];
  let glucoseStdvec = dexcomRegexes.glucoseStdvec.exec(data)?.[1];
  let variationCoefficient: string | undefined = undefined;
  let GMI = dexcomRegexes.GMI.exec(data)?.[1];

  const timeInRange = {
    veryHigh: dexcomRegexes.timeInRange.veryHigh.exec(data)?.[1],
    high: dexcomRegexes.timeInRange.high.exec(data)?.[1],
    moderate: dexcomRegexes.timeInRange.moderate.exec(data)?.[1],
    low: dexcomRegexes.timeInRange.low.exec(data)?.[1],
    veryLow: dexcomRegexes.timeInRange.veryLow.exec(data)?.[1],
  };

  if (!GMI) {
    GMI = dexcomRegexes.GMICapturBackup.exec(data)?.[1];
  }

  if (!timeAtCGM) {
    timeAtCGM = dexcomRegexes.timeAtCGMCapturBackup.exec(data)?.[1];
  }

  if (!glucoseAvg) {
    glucoseAvg = dexcomRegexes.glucoseAvgCapturBackup.exec(data)?.[1];
  }

  const errors = findMissingProperties({
    timeFrame,
    timeFrameStart,
    timeFrameEnd,
    patientName,
    timeAtCGM,
    glucoseAvg,
    glucoseStdvec,
    timeInRangeVeryHigh: timeInRange.veryHigh,
    timeInRangeHigh: timeInRange.high,
    timeInRangeModerate: timeInRange.moderate,
    timeInRangeLow: timeInRange.low,
    timeInRangeVeryLow: timeInRange.veryLow,
  });

  if (
    errors !== undefined ||
    !timeFrame ||
    !timeFrameStart ||
    !timeFrameEnd ||
    !patientName ||
    !timeAtCGM ||
    !glucoseAvg ||
    !glucoseStdvec ||
    !timeInRange.veryHigh ||
    !timeInRange.high ||
    !timeInRange.moderate ||
    !timeInRange.low ||
    !timeInRange.veryLow
  ) {
    throw new Error(`Could not parse Dexcom PDF: ${errors}`);
  }

  const periodStart = parseDate(timeFrameStart);
  const periodEnd = parseDate(timeFrameEnd);

  return {
    periodStart,
    periodEnd,
    timeInRangeVeryHigh: stringToNum(timeInRange.veryHigh),
    timeInRangeHigh: stringToNum(timeInRange.high),
    timeInRangeNormal: stringToNum(timeInRange.moderate),
    timeInRangeLow: stringToNum(timeInRange.low),
    timeInRangeVeryLow: stringToNum(timeInRange.veryLow),

    timeActive: stringToNum(timeAtCGM),
    averageGlucose: stringToNum(glucoseAvg),
    stddevGlucose: stringToNum(glucoseStdvec),
    gmi: GMI !== undefined ? percentToGMI(stringToNum(GMI)) : undefined,
  };
}
