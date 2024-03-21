import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';

async function checkAuht0Url(domain: string) {
	//console.log(domain);
	const domainwithoutTld = domain.split('.').slice(0, -1).join('.');
	//let url = `https://${domain}/.well-known/openid-configuration
	let url = `https://${domainwithoutTld}.auth0.com/.well-known/jwks.json`
	console.log(`domain: ${domain}, url: ${url}`);
	let response = await fetch(url);
	let text = await response.text();
	console.log(`response: ${text.slice(0, 100)}`);
}

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
		//console.log(record[domainColumnIndex]);
		await checkAuht0Url(record[domainColumnIndex]);
	}
}

main();
