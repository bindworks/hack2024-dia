import { ParsedData } from ".";
import { stringToNum, pdfToRgb, pdfToText, pdfToTsv, percentToGMI, findInText } from "../utils";

export async function medtronik640GParser(pdfPath: string): Promise<ParsedData> {
    const result: ParsedData = {};
    const vir = await parseValuesInRange(pdfPath, 160, 180, 320, 510);
    if (vir.empty) {
      return vir;
    }
    Object.assign(result, vir);
    const pdfText = await pdfToText(pdfPath, { layout: true });
    const other = await parseOtherValues(pdfText);
    if (other.empty) {
      return other;
    }
    Object.assign(result, other);
    findInText(pdfText, /Množství bazálu \(za den\)\s+(?:((?:\d|,|\.)+)|--)/, (r) => {
      if (r[1]) {
        result.basalInsulin = stringToNum(r[1])
      }
    });
    return result;
}

export async function medtronik780GParser(pdfPath: string): Promise<ParsedData> {
  const result: ParsedData = {};
  const vir = await parseValuesInRange(pdfPath, 30, 55, 310, 500);
  if (vir.empty) {
    return vir;
  }
  Object.assign(result, vir);
  const pdfText = await pdfToText(pdfPath, { layout: true });
  const other = await parseOtherValues(pdfText);
  if (other.empty) {
    return other;
  }
  Object.assign(result, other);
  findInText(pdfText, /(?:Autom\. bazál \/ bazál\. množství \(za den\)|Auto Basal \/ Basal amount \(per day\))\s+(?:((?:\d|,|\.)+)|--)/, (r) => {
    if (r[1]) {
      result.basalInsulin = stringToNum(r[1])
    }
  });
  findInText(pdfText, /(?:Hodnota automat\. korekce \(za den\)|Auto Correction amount \(per day\))\s+(?:((?:\d|,|\.)+)|--)/, (r) => {
    if (r[1]) {
      result.correctionInsulin = stringToNum(r[1])
    }
  });
  return result;
}

export async function medtronikGuardianParser(pdfPath: string): Promise<ParsedData> {
  const result: ParsedData = {};
  const vir = await parseValuesInRange(pdfPath, 30, 55, 310, 500);
  if (vir.empty) {
    return vir;
  }
  Object.assign(result, vir);
  const pdfText = await pdfToText(pdfPath, { layout: true });
  const other = await parseOtherValues(pdfText);
  if (other.empty) {
    return other;
  }
  Object.assign(result, other);
  findInText(pdfText, /Množství rychle působícího \(za den\)\s+(?:((?:\d|,|\.)+)|--)/, (r) => {
    if (r[1]) {
      result.basalInsulin = stringToNum(r[1])
    }
  });
  return result;
}

async function parseOtherValues(pdfText: string): Promise<ParsedData> {
  const result: ParsedData = {};

  findInText(pdfText, /(?:Používání senzoru \(za týden\)|Sensor Wear \(per week\))\s+(\d+)%/, (r) => result.timeActive = parseFloat(r[1]));
  findInText(pdfText, /(?:Průměrná GS ± SD|Average SG ± SD)\s+((?:\d|,|\.)+)\s*±\s*((?:\d|,|\.)+)/, (r) => {
    result.averageGlucose = stringToNum(r[1]);
    result.stddevGlucose = stringToNum(r[2]);
  });
  findInText(pdfText, /(?:Variační koeficient \(%\)|Coefficient of Variation \(%\))\s+((?:\d|,|\.)+)%/, (r) => result.variationCoefficient = stringToNum(r[1]));
  findInText(pdfText, /GMI\*\*\*\s+(?:((?:\d|,|\.)+)%\s+\(((?:\d|,|\.)+)|--)/, (r) => {
    if (r[2]) {
      result.gmi = stringToNum(r[2]);
    }
  });
  findInText(pdfText, /(?:Celková denní dávka \(za den\)|Total daily dose \(per day\))\s+(?:((?:\d|,|\.)+)|--)/, (r) => {
    if (r[1]) {
      result.dailyInsulinDose = stringToNum(r[1])
    }
  });
  findInText(pdfText, /(?:Množství bolusu \(za den\)|Bolus amount \(per day\)|Množství dlouhodobě působícího \(za den\))\s+(?:((?:\d|,|\.)+)|--)/, (r) => {
    if (r[1]) {
      result.bolusInsulin = stringToNum(r[1])
    }
  });

  const rangeRegex = /^\s*A\s*(\d\d)[-./](\d\d)[-./](\d\d\d\d)\s*-\s*(\d\d)[-./](\d\d)[-./](\d\d\d\d)\s*\(.*/;
  const rangeLine = pdfText.split(/\n/).slice(0, 3).find(l => l.match(rangeRegex));
  if (!rangeLine) {
    throw new Error("Unknown range");
  }
  const rangeMatch = rangeLine.match(rangeRegex);
  if (!rangeMatch) {
    throw new Error("Unknown range");
  }
  result.periodStart = new Date(parseInt(rangeMatch[3]), parseInt(rangeMatch[2]) - 1, parseInt(rangeMatch[1]));
  result.periodEnd = new Date(parseInt(rangeMatch[6]), parseInt(rangeMatch[5]) - 1, parseInt(rangeMatch[4]));

  return result;
}

async function parseValuesInRange(pdfPath: string, xmin: number, xmax: number, ymin: number, ymax: number): Promise<ParsedData> {
  const result: ParsedData = {};
  const pdfTsv = await pdfToTsv(pdfPath, { firstPage: true });
  const valuesInRange = pdfTsv.filter(r => r.left > xmin && r.left < xmax && r.top > ymin && r.top < ymax && /^\d+%$/.test(r.text));

  if (valuesInRange.length === 0) {
    const nedostupne = pdfTsv.find(r => r.left > xmin && r.left < xmax + 40 && r.top > ymin && r.top < ymax && r.text === 'Nedostupné');
    if (nedostupne) {
      return { empty: true };
    }
    throw new Error('Could not find values in range');
  }

  valuesInRange.sort((left, right) => left.top - right.top);

  // if all 5 values are present, it's evident
  if (valuesInRange.length === 5) {
    result.timeInRangeVeryHigh = parseFloat(valuesInRange[0].text);
    result.timeInRangeHigh = parseFloat(valuesInRange[1].text);
    result.timeInRangeNormal = parseFloat(valuesInRange[2].text);
    result.timeInRangeLow = parseFloat(valuesInRange[3].text);
    result.timeInRangeVeryLow = parseFloat(valuesInRange[4].text);
    return result;
  }

  const xbar = Math.floor(valuesInRange.map(r => r.left + r.width).reduce((acc, i) => Math.max(acc, i), 0) + 10);

  // find the green one
  var greenOne=0;
  for (greenOne=0; greenOne<valuesInRange.length; greenOne++) {
    const swatch = await pdfToRgb(pdfPath, 72, xbar, Math.floor(valuesInRange[greenOne].top + 3), 16, 1);
    if (isGreen(swatch)) {
      break;
    }
  }

  if (greenOne===valuesInRange.length) {
    throw new Error("Could not find the green band");
  }

  result.timeInRangeNormal = parseFloat(valuesInRange[greenOne].text);
  result.timeInRangeHigh = greenOne-1 >= 0 ? parseFloat(valuesInRange[greenOne-1].text) : 0;
  result.timeInRangeVeryHigh = greenOne-2 >= 0 ? parseFloat(valuesInRange[greenOne-2].text) : 0;
  result.timeInRangeLow = greenOne+1 < valuesInRange.length ? parseFloat(valuesInRange[greenOne+1].text) : 0;
  result.timeInRangeVeryLow = greenOne+2 < valuesInRange.length ? parseFloat(valuesInRange[greenOne+2].text) : 0;
  return result;
}

function isGreen(n: number[][]): boolean {
  return n.every(rgb => rgb[0] > 130 && rgb[0] < 140 && rgb[1] > 205 && rgb[1] < 215 && rgb[2] > 135 && rgb[2] < 145);
}
