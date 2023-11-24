import { ParsedData } from ".";
import { pdfToTsv } from "../utils";

export async function medtronik640GParser(pdfPath: string): Promise<ParsedData> {
    const pdfTsv = await pdfToTsv(pdfPath, { firstPage: true });
    const valuesInRange = pdfTsv.filter(r => r.left > 160 && r.left < 180 && r.top > 320 && r.top < 510 && !r.text.startsWith('###'));
    console.log(valuesInRange);
    throw new Error("not impemented");
}
