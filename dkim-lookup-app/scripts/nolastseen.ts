import { prisma } from "@/lib/db";
import { fetchDkimDnsRecord } from "@/lib/fetchDkimDnsRecord";

async function main() {
	let keys = await prisma.dkimRecord.findMany({
		where: {
			lastSeenAt: null
		}
	})
	console.log(`found ${keys.length} domain/selector pairs with no last seen date`);
	for (let key of keys) {
		let dsp = await prisma.domainSelectorPair.findUnique({
			where: {
				id: key.domainSelectorPairId
			}
		});
		if (!dsp?.selector || !dsp?.domain) {
			console.log(`no domain/selector pair found for ${key.id}`);
			continue;
		}
		console.log(`#${key.id}: ${key.value}, ${dsp.domain}, ${dsp.selector}`);
		console.log(`dsp last fetched at: ${dsp.lastRecordUpdate}`);
		const qname = `${dsp.selector}._domainkey.${dsp.domain}`;
		console.log(`fetching ${qname} from dns`);
		let dkimDnsRecord = await fetchDkimDnsRecord(dsp.domain, dsp.selector);
		if (!dkimDnsRecord) {
			console.log(`no dkim dns record found for ${dsp.selector}, ${dsp.domain}`);
			continue;
		}
		await prisma.dkimRecord.update({
			where: { id: key.id },
			data: { lastSeenAt: dkimDnsRecord.timestamp }
		});
		//break;
	}
}

main();
