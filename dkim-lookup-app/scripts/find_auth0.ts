import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';


async function main() {
	let csvFilename = process.argv[2];
	let domainColumnIndex = parseInt(process.argv[3]);
	if (!csvFilename || !domainColumnIndex) {
		console.error("Usage: node parse_csv.js <csvFilename> <domainColumnIndex>");
		process.exit(0);
	}
	const input = readFileSync(csvFilename, 'utf8');
	const records = parse(input, { columns: false, skip_empty_lines: true });
	for (let record of records) {
		console.log(record[domainColumnIndex]);
	}
}

main();
