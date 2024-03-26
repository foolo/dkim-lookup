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

	for (const domain of domains) {
		console.log(`${new Date().toISOString()} checking domain ${domain}`);
		for (const selector of selectors) {
			let dsp = await prisma.domainSelectorPair.findFirst({
				where: {
					domain: {
						equals: domain,
						mode: Prisma.QueryMode.insensitive,
					},
					selector: {
						equals: selector,
						mode: Prisma.QueryMode.insensitive
					}
				}
			});
			if (!dsp) {
				const dkimDnsRecord = await fetchDkimDnsRecord(domain, selector);
				if (dkimDnsRecord) {
					if (checkkVersion(dkimDnsRecord.value)) {
						console.log(`found dkim dns record for ${selector}._domainkey.${domain}: ${truncate(dkimDnsRecord.value, 50)}`);
					}
				}
			}
		}
	}
}

main();
