import { createClassifier } from "./classifier";

async function main(): Promise<number> {
  const pdfPath = process.argv[2];
  const classifier = createClassifier();
  try {
    const parser = await classifier.classify(pdfPath);
    if (!parser) {
      console.log(
        `ERROR\t${pdfPath}\t${JSON.stringify({ error: "unrecognized" })}`
      );
      return 1;
    }
    const data = await parser(pdfPath);
    console.log(`SUCCESS\t${pdfPath}\t${JSON.stringify(data)}`);
    return 0;
  } catch (e) {
    console.log(
      `ERROR\t${pdfPath}\t${JSON.stringify({
        error: String(e),
        ...(e instanceof Error ? { stack: e.stack } : {})
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
