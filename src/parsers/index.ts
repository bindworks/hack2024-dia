export interface ParsedData {
    periodStart?: Date,
    periodEnd?: Date,
    /**
     * percentage from 0 to 1
     */
    timeActive?: number,
    /**
     * percentage from 0 to 1
     */
    timeInRangeVeryHigh?: number,
    /**
     * percentage from 0 to 1
     */
    timeInRangeHigh?: number,
    /**
     * percentage from 0 to 1
     */
    timeInRangeNormal?: number,
    /**
     * percentage from 0 to 1
     */
    timeInRangeLow?: number,
    /**
     * percentage from 0 to 1
     */
    timeInRangeVeryLow?: number,
    /**
     * mmol/l
     */
    averageGlucose?: number,
    /**
     * mmol/l
     */
    stddevGlucose?: number,
    /**
     * mmol/mol
     */
    gmi?: number,
    /**
     * units
     */
    dailyInsulinDose?: number,
    /**
     * units
     */
    basalInsulin?: number,
    /**
     * units
     */
    correctionInsulin?: number,
    /**
     * units
     */
    bolusInsulin?: number,
}

export type ReportParser = (pdfPath: string) => Promise<ParsedData>;
