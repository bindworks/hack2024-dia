# GlucoMiner parser

An AGP PDF report parser, to extract GMI, In Range Parameters, Active Time, Average Glucose, and Standard Deviation.

## Requirements

- Typescript
- Poppler (23.02.0) Ubuntu default version is too old, install from source

## How to run

### CLI

- Install dependencies: `npm install`
- Insert PDFs to parse into `./DATA` folder
- Run `npm run runall > PARSEALL`
- Run `./genpdf.sh` to generate a PDF with all the parsed data

### REST API

- Install dependencies: `npm install`
- Run `npm run serve`
- Send a POST request to `http://localhost:3000/api/scan` with a `multipart/form-data` body containing the PDF file to parse in the `report` field.
