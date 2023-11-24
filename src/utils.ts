import { exec } from 'child_process';

export interface ExecuteOutput {
    stdout: string;
    stderr: string;
}

export async function execute(command: string): Promise<ExecuteOutput> {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve({ stdout, stderr });
            }
        })
    });
}

export interface PdfToTextSettings {
    layout?: boolean;
}

export async function pdfToText(pdfPath: string, settings?: PdfToTextSettings): Promise<string> {
    const command = ["pdftotext"];
    if (settings?.layout) {
        command.push("-layout");
    }
    command.push(`"${pdfPath}"`);
    command.push(`-`);
    
    const out = await execute(command.join(" "));
    return out.stdout;
}
