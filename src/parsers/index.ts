export interface ParsedData {
    periodStart?: Date,
    periodEnd?: Date,
    /**
     * percentage from 0 to 100
     */
    timeActive?: number,
    /**
     * percentage from 0 to 100
     */
    timeInRangeVeryHigh?: number,
    /**
     * percentage from 0 to 100
     */
    timeInRangeHigh?: number,
    /**
     * percentage from 0 to 100
     */
    timeInRangeNormal?: number,
    /**
     * percentage from 0 to 100
     */
    timeInRangeLow?: number,
    /**
     * percentage from 0 to 100
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
     * percentage from 0 to 100
     */
    variationCoefficient?: number,
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
