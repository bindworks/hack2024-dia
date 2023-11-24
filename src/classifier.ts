import { ReportParser } from "./parsers";
import { dexcomParser } from "./parsers/dexcom";
import { libreAGPParser } from "./parsers/libre";
import { medtronik640GParser, medtronik780GParser, medtronikGuardianParser } from "./parsers/medtronik";
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
    if (pdfContents.indexOf("MiniMed 780G") > -1) {
      return medtronik780GParser;
    }
    if (pdfContents.indexOf("Guardian™") > -1) {
      return medtronikGuardianParser;
    }

    if (pdfContents.indexOf("AGP") > -1) {
      return libreAGPParser;
    }
  }
}
