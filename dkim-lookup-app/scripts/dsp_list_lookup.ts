import { prisma } from '@/lib/db';
import { parseDkimRecord, truncate } from '@/lib/utils';
import { fetchDkimDnsRecord } from '@/lib/utils_server';
import { Prisma } from '@prisma/client';
import { readFileSync } from 'node:fs';

function load_list(filename: string): string[] {
	const fileContents = readFileSync(filename, 'utf8');
	return fileContents.split('\n').map(line => line.trim()).filter(line => line);
}

function checkkVersion(dkimValue: string): boolean {
	const version = parseDkimRecord(dkimValue).v;
	return (version === null || version === 'DKIM1');
}

async function asyncFetch(domain: string, selector: string) {
	const dkimDnsRecord = await fetchDkimDnsRecord(domain, selector);
	if (dkimDnsRecord) {
		if (checkkVersion(dkimDnsRecord.value)) {
			console.log(`found dkim dns record for ${selector}._domainkey.${domain}: ${truncate(dkimDnsRecord.value, 50)}`);
		}
	}
}

async function main() {
	const args = process.argv.slice(2);
	if (args.length < 2 || args.length > 3) {
		console.log('usage: pnpm try_selectors DOMAINS_LIST SELECTORS_LIST START_WITH_DOMAIN');
		process.exit(1);
	}
	let [domainsFilename, selectorsFilename, startWithDomain] = args;
	const domains = load_list(domainsFilename);
	const selectors = readFileSync(selectorsFilename, 'utf8').split('\n').map(line => line.trim()).filter(line => line).map(line => line.split('\t')[0].trim());
	const startIndex = startWithDomain ? domains.indexOf(startWithDomain) : 0;
	if (startIndex < 0) {
		console.log(`domain ${startWithDomain} not found in list`);
		process.exit(1);
	}
	domains.splice(0, startIndex);

	let dsps = await prisma.domainSelectorPair.findMany();
	let dspMap = new Map<string, boolean>();
	let count = 0;
	let lastCountLog = 0;
	for (let dsp of dsps) {
		dspMap.set(`${dsp.domain}/${dsp.selector}`.toLowerCase(), true);
	}
	for (const domain of domains) {
		console.log(`${new Date().toISOString()} checking domain ${domain}`);
		let promiseArray = [];
		for (const selector of selectors) {
			if (dspMap.has(`${domain}/${selector}`.toLowerCase())) {
				continue;
			}
			let pr = asyncFetch(domain, selector);
			promiseArray.push(pr);
			if (promiseArray.length >= 10) {
				//console.log('waiting for promises to resolve');
				await Promise.all(promiseArray);
				count += promiseArray.length;
				promiseArray = [];
			}
			if (count - lastCountLog > 1000) {
				console.log('processed', count);
				lastCountLog = count;
			}
		}
	}
}

main();
