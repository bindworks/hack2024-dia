export interface ParsedData {

}

export type ReportParser = (pdfPath: string) => Promise<ParsedData>;
