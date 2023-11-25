import * as fs from 'fs';
import moment from 'moment';
import { mmolToPercentGMI } from './utils';

const jsonData = JSON.parse(fs.readFileSync(0, "utf-8"));

const periodStart = moment(jsonData.periodStart).format('YYYY-MM-DD');
const periodEnd = moment(jsonData.periodEnd).format('YYYY-MM-DD');
const gmiPercent = jsonData.gmi && mmolToPercentGMI(jsonData.gmi);

console.log(`
\\documentclass[varwidth]{standalone}

\\begin{document}

\\begin{table}[h]
    \\centering
    \\begin{tabular}{|r|l|}
        \\hline
        \\textbf{Položka} & \\textbf{Hodnota} \\\\
        \\hline
        \\hline
        Datum & ${periodStart} - ${periodEnd} \\\\
        Aktivní čas & ${jsonData.timeActive?.toFixed(2) ?? '-'} \\% \\\\
        \\hline
        Velmi vysoká hodnota & ${jsonData.timeInRangeVeryHigh?.toFixed(0) ?? '-'} \\% \\\\
        Vysoká hodnota & ${jsonData.timeInRangeHigh?.toFixed(0) ?? '-'} \\% \\\\
        Normální hodnota & ${jsonData.timeInRangeNormal?.toFixed(0) ?? '-'} \\% \\\\
        Nízká hodnota & ${jsonData.timeInRangeLow?.toFixed(0) ?? '-'} \\% \\\\
        Velmi nízká hodnota & ${jsonData.timeInRangeVeryLow?.toFixed(0) ?? '-'} \\% \\\\
        \\hline
        Průměrná hodnota & ${jsonData.averageGlucose?.toFixed(2) ?? '-'} mmol/l \\\\
        Směrodatná odchylka & ${jsonData.stddevGlucose?.toFixed(2) ?? '-'} mmol/l \\\\
        Variační koeficient & ${jsonData.variationCoefficient?.toFixed(2) ?? '-'} \\% \\\\
        GMI & ${jsonData.gmi?.toFixed(2) ?? '-'} mmol/mol (${gmiPercent?.toFixed(2) ?? '-'} \\%)\\\\
        \\hline
        Denní dávka insulinu & ${jsonData.dailyInsulinDose?.toFixed(2) ?? '-'} jedn. \\\\
        Bazální insulin & ${jsonData.basalInsulin?.toFixed(2) ?? '-'} jedn. \\\\
        Bolusový insulin & ${jsonData.bolusInsulin?.toFixed(2) ?? '-'} jedn. \\\\
        \\hline
        \\hline
    \\end{tabular}
    \\caption{Výsledek zpracování}
    \\label{tab:names_values}
\\end{table}

\\end{document}
`)
