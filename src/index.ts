import { createClassifier } from "./classifier";

async function main(): Promise<number> {
  const pdfPath = process.argv[2];
  const classifier = createClassifier();
  try {
    const parser = await classifier.classify(pdfPath);
    if (!parser) {
      console.log(`${pdfPath}: ${JSON.stringify({ error: "unrecognized" })}`);
      return 1;
    }
    const data = await parser(pdfPath);
    console.log(`${pdfPath}: ${JSON.stringify(data)}`);
    return 0;
  } catch (e) {
    const err = e as Error;
    console.log(
      `${pdfPath}: ${JSON.stringify({
        error: err.message,
        stack: err.stack,
      })}`
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
