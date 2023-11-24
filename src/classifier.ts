import { ReportParser } from "./parsers";
import { dexcomParser } from "./parsers/dexcom";
import { pdfToText } from "./utils";

export interface Classifier {
    classify(pdfPath: string): Promise<ReportParser | undefined>;
}

export function createClassifier(): Classifier {
    return {
        classify,
    }

    async function classify(pdfPath: string): Promise<ReportParser | undefined> {
        const pdfContents = await pdfToText(pdfPath);
        if (pdfContents.indexOf('Dexcom') > -1) {
            return dexcomParser;
        }
    }
}