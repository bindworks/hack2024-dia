import { parsePpm, pdfToRgb } from "../src/utils";
import { join } from "path";

describe("parsePpm", function() {
  it("should read PPM", async function() {
    const result = parsePpm(join(__dirname, "parsePpm.ppm"));
    console.log(result);
  });

  it("should read PDF", async function() {
    const result = await pdfToRgb(join(__dirname, "parsePpm.pdf"), 72, 190, 440, 16, 9);
    console.log(result);
  });
})
