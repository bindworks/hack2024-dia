import { ReportParser } from "./parsers";
import { dexcomParser } from "./parsers/dexcom";
import { libreAGPParser } from "./parsers/libre";
import { medtronik640GParser } from "./parsers/medtronik640G";
import { pdfToText } from "./utils";

export interface Classifier {
  classify(pdfPath: string): Promise<ReportParser | undefined>;
}

export function createClassifier(): Classifier {
  return {
    classify,
  };

  async function classify(pdfPath: string): Promise<ReportParser | undefined> {
    const pdfContents = await pdfToText(pdfPath);
    if (pdfContents.indexOf("Dexcom") > -1) {
      return dexcomParser;
    }
    if (pdfContents.indexOf("MiniMed 640G") > -1) {
      return medtronik640GParser;
    }

    if (pdfContents.indexOf("AGP") > -1) {
      return libreAGPParser;
    }
  }
}
