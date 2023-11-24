import { ParsedData } from ".";
import { pdfToTsv } from "../utils";

export async function medtronik640GParser(pdfPath: string): Promise<ParsedData> {
    const pdfTsv = await pdfToTsv(pdfPath);
    console.log(pdfTsv);
    throw new Error("not impemented");
}
