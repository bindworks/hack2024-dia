import { ParsedData } from ".";
import { pdfToText } from "../utils";
import * as papaparse from "papaparse";

export async function medtronik640GParser(pdfPath: string): Promise<ParsedData> {
    const pdfTsvText = await pdfToText(pdfPath, { tsv: true });
    const pdfTsv = papaparse.parse(pdfTsvText, {});
    console.log(pdfTsv);
    throw new Error("not impemented");
}
