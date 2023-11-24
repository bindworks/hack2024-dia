import { ParsedData } from ".";
import { isNumeric, parseCzFloat, pdfToRgb, pdfToText, pdfToTsv, percentToGMI } from "../utils";

export async function medtronik640GParser(pdfPath: string): Promise<ParsedData> {
    const result: ParsedData = {};
    const pdfTsv = await pdfToTsv(pdfPath, { firstPage: true });
    if (!await parseValuesInRange(160, 180, 320, 510, 190)) {
      return { empty: true }
    }
    const pdfText = await pdfToText(pdfPath, { layout: true });

    findInText(pdfText, /Používání senzoru \(za týden\)\s+(\d+)%/, (r) => result.timeActive = parseFloat(r[1]));
    findInText(pdfText, /Průměrná GS ± SD\s+((?:\d|,)+)\s*±\s*((?:\d|,)+)/, (r) => {
      result.averageGlucose = parseCzFloat(r[1]);
      result.stddevGlucose = parseCzFloat(r[2]);
    });
    findInText(pdfText, /Variační koeficient \(%\)\s+((?:\d|,)+)%/, (r) => result.variationCoefficient = parseCzFloat(r[1]));
    findInText(pdfText, /GMI\*\*\*\s+(?:((?:\d|,)+)%|--)/, (r) => {
      if (isNumeric(r[1])) result.gmi = percentToGMI(parseCzFloat(r[1]))
    });

    return result;


    async function parseValuesInRange(xmin: number, xmax: number, ymin: number, ymax: number, xbar: number): Promise<boolean> {
      const valuesInRange = pdfTsv.filter(r => r.left > xmin && r.left < xmax && r.top > ymin && r.top < ymax && /^\d+%$/.test(r.text));

      if (valuesInRange.length === 0) {
        const nedostupne = pdfTsv.find(r => r.left > xbar && r.left < xbar + 20 && r.top > ymin && r.top < ymax && r.text === 'Nedostupné');
        if (nedostupne) {
          return false;
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
        return true;
      }

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
      return true;
    }
}

function findInText(text: string, regex: RegExp, assign: (res: RegExpExecArray) => void) {
  const match = regex.exec(text);
  if (!match) {
    throw new Error('No match');
  }
  assign(match);
}

function isGreen(n: number[][]): boolean {
  return n.every(rgb => rgb[0] > 130 && rgb[0] < 140 && rgb[1] > 205 && rgb[1] < 215 && rgb[2] > 135 && rgb[2] < 145);
}
