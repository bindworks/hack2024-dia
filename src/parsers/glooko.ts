import { ParsedData } from ".";
import { PdfTsvRecord, doThrow, findInText, pdfToText, pdfToTsv, stringToNum } from "../utils";
import { months } from "./constants";

export async function glookoParser(pdfPath: string): Promise<ParsedData> {
  const result: ParsedData = {};
  const pdfPagesContents = (await pdfToText(pdfPath, { layout: true, startPage: 1, endPage: 3 })).split('\x0c');

  const cgmSummaryPageIndex = pdfPagesContents.findIndex(pageText =>
    pageText.match(/^.*(?:Souhrn CGM|CGM Summary)$/m)
    && pageText.match(/(?:Glukóza [-–] čas v rozmezí|Glucose [-–] Time In Range)/)
  );
  const hasCgmSummary = cgmSummaryPageIndex > -1;

  if (hasCgmSummary) {
    const summaryTsv = mergeTsv(await pdfToTsv(pdfPath, { startPage: cgmSummaryPageIndex + 1, endPage: cgmSummaryPageIndex + 1 }));
    await parseCgmSummary(pdfPagesContents[cgmSummaryPageIndex], summaryTsv);
  }

  const glycemiaSummaryPageIndex = pdfPagesContents.findIndex(pageText =>
    pageText.match(/^.*(?:Souhrn glykémie|BG Summary|Zhrnutie glukózy v krvi|Riepilogo BG)$/m)
    && pageText.match(/Glykémie \(Glykémie\)|Glucose \(BG\)|Glukóza \(Glukóza v krvi\)|Glicemia \(BG\)/)
  );
  const hasGlycemiaSummary = glycemiaSummaryPageIndex > -1;

  if (hasGlycemiaSummary) {
    const summaryTsv = mergeTsv(await pdfToTsv(pdfPath, { startPage: glycemiaSummaryPageIndex + 1, endPage: glycemiaSummaryPageIndex + 1 }));
    await parseGlycemiaSummary(pdfPagesContents[glycemiaSummaryPageIndex], summaryTsv);
  }

  return result;

  async function parseCgmSummary(summaryContents: string, summaryTsv: PdfTsvRecord[]) {
    findInText(summaryContents, /^\s*(\d+)%\s+(?:Velmi vysoká|Very High|Veľmi vysoké|Molto alta)/m, (r) => result.timeInRangeVeryHigh = stringToNum(r[1]));
    findInText(summaryContents, /^\s*(\d+)%\s+(?:Vysoká hodnota|High|Vysoké|Alta)/m, (r) => result.timeInRangeHigh = stringToNum(r[1]));
    findInText(summaryContents, /^\s*(\d+)%\s+(?:Cílový rozsah|Target Range|Cieľový rozsah|Intervallo target)/m, (r) => result.timeInRangeNormal = stringToNum(r[1]));
    findInText(summaryContents, /^\s*(\d+)%\s+(?:Nízká hodnota|Low|Nízke|Bassa)/m, (r) => result.timeInRangeLow = stringToNum(r[1]));
    findInText(summaryContents, /^\s*(\d+)%\s+(?:Velmi nízká|Very Low|Veľmi nízke|Molto bassa)/m, (r) => result.timeInRangeVeryLow = stringToNum(r[1]));
    findInCsvUnder(summaryTsv, 280, 320, 60, 250, /^Průměr|Average|Priemer|Media$/, /(?:((?:\d|,|\.)+)|-) mmol\/[lL]/, (r) => {
      if (r[1]) {
        result.averageGlucose = stringToNum(r[1]);
      }
    });
    findInCsvUnder(summaryTsv, 280, 320, 60, 250, /^GMI$/, /(?:((?:\d|,|\.)+)\s*%\s*\(((?:\d|,|\.)+)\s*mmol\/mol\)|Není|N\/A)/, (r) => {
      if (r[2]) {
        result.gmi = stringToNum(r[2]);
      }
    });
    findInCsvUnder(summaryTsv, 280, 320, 60, 250, /^% čas CGM aktivní|% Time CGM Active$/, /(?:((?:\d|,|\.)+)|-)\s*%/, (r) => {
      if (r[1]) {
        result.timeActive = stringToNum(r[1]);
      }
    });
    findInText(summaryContents, /\b(?:SD|Směrodatná odchylka|Štandardná odchýlka)\s+(?:((?:\d|,|\.)+)|-)\s*mmol\/[lL]/, (r) => {
      if (r[1]) {
        result.stddevGlucose = stringToNum(r[1]);
      }
    });
    findInText(summaryContents, /\b(?:CV)\s+(?:((?:\d|,|\.)+)|-)\s*%/, (r) => {
      if (r[1]) {
        result.variationCoefficient = stringToNum(r[1]);
      }
    });
    findInText(summaryContents, /\b(?:Datum narození|DOB|Dátum narodenia):.*\b((?:\d{1,2}\.\s?\d{1,2}\.\s?\d{4}|\w{3}\s+\d{1,2},\s*\d{4}|\d{2}\s+\w{3}\s+\d{4}))\s?-\s?((?:\d{1,2}\.\s?\d{1,2}\.\s?\d{4}|\w{3}\s+\d{1,2},\s*\d{4}|\d{2}\s+\w{3}\s+\d{4}))/, (r) => {
      result.periodStart = parseGlookoDate(r[1]);
      result.periodEnd = parseGlookoDate(r[2]);
    });
}

  async function parseGlycemiaSummary(summaryContents: string, summaryTsv: PdfTsvRecord[]) {
    if (!hasCgmSummary) {
      findInText(summaryContents, /^\s*(?:Velmi vysoká|Very High|Veľmi vysoké|Molto alta)\s+(\d+)%/m, (r) => result.timeInRangeVeryHigh = stringToNum(r[1]));
      findInText(summaryContents, /^\s*(?:Vysoká hodnota|High|Vysoké|Alta)\s+(\d+)%/m, (r) => result.timeInRangeHigh = stringToNum(r[1]));
      findInText(summaryContents, /^\s*(?:Cílový rozsah|Target Range|Cieľový rozsah|Intervallo target)\s+(\d+)%/m, (r) => result.timeInRangeNormal = stringToNum(r[1]));
      findInText(summaryContents, /^\s*(?:Nízká hodnota|Low|Nízke|Bassa)\s+(\d+)%/m, (r) => result.timeInRangeLow = stringToNum(r[1]));
      findInText(summaryContents, /^\s*(?:Velmi nízká|Very Low|Veľmi nízke|Molto bassa)\s+(\d+)%/m, (r) => result.timeInRangeVeryLow = stringToNum(r[1]));
      findInText(summaryContents, /^\s*(?:Průměr|Media|Average|Priemer)\s*(?:((?:\d|,|\.)+)|-)/m, (r) => {
        if (r[1]) {
          result.averageGlucose = stringToNum(r[1]);
        }
      });
      findInText(summaryContents, /^\s*(?:Směrodatná odchylka|SD|Štandardná odchýlka)\s*(?:((?:\d|,|\.)+)|-)/m, (r) => {
        if (r[1]) {
          result.stddevGlucose = stringToNum(r[1]);
        }
      });
      findInText(summaryContents, /\b((?:\d{1,2}\.\s?\d{1,2}\.\s?\d{4}|\w{3}\s+\d{1,2},\s*\d{4}|\d{2}\s+\w{3}\s+\d{4}))\s?-\s?((?:\d{1,2}\.\s?\d{1,2}\.\s?\d{4}|\w{3}\s+\d{1,2},\s*\d{4}|\d{2}\s+\w{3}\s+\d{4}))\s*\(\d+\s+(?:dní|days|d\.)\)/, (r) => {
        result.periodStart = parseGlookoDate(r[1]);
        result.periodEnd = parseGlookoDate(r[2]);
      });
    }

    if (summaryContents.match(/Podrobnosti systému|System Details/)) {
      findInText(summaryContents, /(?:Control-IQ|Bazální-IQ|Auto mode 'On')\s*(?:((?:\d|,|\.)+))/, (r) => result.timeActive = stringToNum(r[1]));
      const { bolusText, basalText } = findBasalAndBolusValueStrings();
      result.bolusInsulin = parseBasalBolusValue(bolusText);
      result.basalInsulin = parseBasalBolusValue(basalText);
      findInText(summaryContents, /(?:Denní dávka|Insulin\/day|Inzulin\/den|Daily Dose)\s*((?:\d|,|\.)+)\s*(?:jednotky|units)/i, (r) => result.dailyInsulinDose = stringToNum(r[1]));

      function parseBasalBolusValue(value: string): number {
        const m = /(?:\d|,|\.)+%\s+((?:\d|,|\.)+)\s+(?:units|jednotky)$/.exec(value);
        if (!m) {
          throw new Error("Cannot parse " + value);
        }
        return stringToNum(m[1]);
      }

      function findBasalAndBolusValueStrings(): { basalText: string, bolusText: string } {
        const basalTitle = summaryTsv.find(r => r.text.match(/^(?:Bazál\/den|Basal\/Day)$/)) ?? doThrow(() => new Error("basal not found"));
        const bolusTitle = summaryTsv.find(r => r.text.match(/^(?:Bolus\/den|Bolus\/Day)$/)) ?? doThrow(() => new Error("bolus not found"));
        if (Math.abs(basalTitle.left - bolusTitle.left) < 10) {
          const basalValue = summaryTsv.find(r => Math.abs(r.left - basalTitle.left) < 10 && r.top < basalTitle.top && r.text.match(/(?:\d|,|\.)+%\s+(?:\d|,|\.)+\s+(?:jednotky|units)/));
          const bolusValue = summaryTsv.find(r => Math.abs(r.left - bolusTitle.left) < 10 && r.top > basalTitle.top && r.top < bolusTitle.top && r.text.match(/(?:\d|,|\.)+%\s+(?:\d|,|\.)+\s+(?:jednotky|units)/));
          if (!basalValue || !bolusValue) {
            throw new Error("Cannot find bolus or basal");
          }
          return {
            basalText: basalValue.text,
            bolusText: bolusValue.text,
          }
        } else {
          const rowsAboveBasal = summaryTsv.filter(r => Math.abs(r.right - basalTitle.right) < 10 && r.top < basalTitle.top).sort(byReverseTop).slice(0, 3).reverse();
          const rowsAboveBolus = summaryTsv.filter(r => Math.abs(r.left - bolusTitle.left) < 10 && r.top < bolusTitle.top).sort(byReverseTop).slice(0, 3).reverse();
          return {
            basalText: rowsAboveBasal.map(r => r.text).join(' '),
            bolusText: rowsAboveBolus.map(r => r.text).join(' ')
          }
        }
      }
    }
  }
}

function byReverseTop(left: PdfTsvRecord, right: PdfTsvRecord): number {
  return right.top - left.top;
}

function findInCsv(csv: PdfTsvRecord[], minx: number, maxx: number, miny: number, maxy: number, pattern: RegExp, assign: (r: RegExpExecArray) => void) {
  const item = csv.find(r => r.left > minx && r.left < maxx && r.top > miny && r.top < maxy && r.text.match(pattern));
  if (!item) {
    throw new Error('Not found');
  }
  const match = pattern.exec(item.text);
  if (!match) {
    throw new Error('Not found');
  }
  assign(match);
}

function findInCsvUnder(csv: PdfTsvRecord[], minx: number, maxx: number, miny: number, maxy: number, toppattern: RegExp, pattern: RegExp, assign: (r: RegExpExecArray) => void) {
  const topItems = csv.filter(r => r.left > minx && r.left < maxx && r.top > miny && r.top < maxy && r.text.match(toppattern));
  for (const topItem of topItems) {
    const item = csv.find(r => Math.abs(r.left - topItem.left) < 10 && Math.abs(r.top - topItem.top) < 20 && r.text.match(pattern));
    if (!item) {
      continue;
    }
    const match = pattern.exec(item.text);
    if (!match) {
      continue;
    }
    assign(match);
    return;
  }
  throw new Error('Not found')
}

function mergeTsv(csv: PdfTsvRecord[]): PdfTsvRecord[] {
  const output: PdfTsvRecord[] = [];
  let previous: PdfTsvRecord | undefined;
  for (let record of csv) {
    if (!record.text) {
      continue;
    }
    if (record.text.startsWith('###')) {
      flush();
      continue;
    }
    if (!previous) {
      previous = record;
      continue;
    }
    previous.width += record.width;
    previous.text += ' ' + record.text;
  }
  flush();
  return output;

  function flush() {
    if (previous) {
      previous.right = previous.left + previous.width;
      previous.bottom = previous.top + previous.height;
      output.push(previous);
      previous = undefined;
    }
  }
}

function dumpCsv(csv: PdfTsvRecord[]) {
  console.log(csv.map(r => `${r.left}\t${r.top}\t${r.text}`).join('\n'));
}

function parseGlookoDate(date: string): Date {
  const czMatch = /(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})/.exec(date);
  if (czMatch) {
    return new Date(parseInt(czMatch[3]), parseInt(czMatch[2]) - 1, parseInt(czMatch[1]), );
  }
  const en1Match = /(\w{3})\s+(\d{1,2}),\s*(\d{4})/.exec(date);
  if (en1Match) {
    return new Date(parseInt(en1Match[3]), parseEnMonth(en1Match[1]), parseInt(en1Match[2]));
  }
  const en2Match = /(\d{2})\s+(\w{3})\s+(\d{4})/.exec(date);
  if (en2Match) {
    return new Date(parseInt(en2Match[3]), parseEnMonth(en2Match[2]), parseInt(en2Match[1]));
  }
  throw new Error("Unrecognized date");
}

function parseEnMonth(month: string): number {
  return months[month.toLowerCase()];
}
