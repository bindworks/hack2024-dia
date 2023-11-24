import { ParsedData } from ".";
import { pdfToText } from "../utils";

export async function glookoPatientCopyParser(pdfPath: string): Promise<ParsedData> {
  const result: ParsedData = {};
  const pdfContents = await pdfToText(pdfPath, { layout: true, secondPage: true });

  console.log(pdfContents);
  throw new Error("not implemented");
}
