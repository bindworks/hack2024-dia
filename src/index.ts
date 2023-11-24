import { createClassifier } from "./classifier";

async function main(): Promise<number> {
  const pdfPath = process.argv[2];
  const classifier = createClassifier();
  try {
    const parser = await classifier.classify(pdfPath);
    if (!parser) {
      console.log(
        `\x1b[31m${pdfPath}: ${JSON.stringify({
          error: "unrecognized",
        })}\x1b[0m`
      );
      return 1;
    }
    const data = await parser(pdfPath);
    console.log(`\x1b[32mSUCCESS: ${pdfPath}: ${JSON.stringify(data)}\x1b[0m`);
    return 0;
  } catch (e) {
    console.log(
      `\x1b[31mERROR: ${pdfPath}: ${JSON.stringify({
        error: String(e),
      })}\x1b[0m`
    );
    return 2;
  }
}

main()
  .then((v) => process.exit(v))
  .catch((e) => {
    console.error("Exception");
    console.error(e);
    process.exit(250);
  });
