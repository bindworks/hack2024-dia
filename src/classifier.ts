import { ReportParser } from "./parsers";
import { dexcomParser } from "./parsers/dexcom";
import { glookoParser } from "./parsers/glooko";
import { libreAGPParser } from "./parsers/libre";
import {
  medtronik640GParser,
  medtronik780GParser,
  medtronikGuardianParser,
} from "./parsers/medtronik";
import { pdfToText } from "./utils";

export interface Classifier {
  classify(pdfPath: string): Promise<ReportParser | undefined>;
}

export function createClassifier(): Classifier {
  return {
    classify,
  };

  async function classify(pdfPath: string): Promise<ReportParser | undefined> {
    const pdfContents = await pdfToText(pdfPath, {
      firstPage: true,
      startPage: 1,
      endPage: 3,
    });

    if (pdfContents.indexOf("Glooko") > -1) {
      return glookoParser;
    }

    if (pdfContents.indexOf("Dexcom") > -1) {
      if (pdfContents.indexOf("Nightscout") > -1) {
        throw new Error("Old report - should'nt be parsed");
      }

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

    if (pdfContents.indexOf("AGP") > -1 && pdfContents.indexOf("Libre") > -1) {
      return libreAGPParser;
    }

    if (
      pdfContents.indexOf("Snapshot") > -1 &&
      pdfContents.indexOf("Libre") > -1
    ) {
      throw new Error("Old report - should'nt be parsed");
    }
  }
}
