import { prisma } from "@/lib/db";

async function main() {
	let dsps = await prisma.domainSelectorPair.findMany();
	let count = 0;
	for (let dsp_index = 0; dsp_index < dsps.length; dsp_index++) {
		const dsp = dsps[dsp_index];
		let dkimRecords = await prisma.dkimRecord.findMany({
			where: {
				domainSelectorPair: dsp
			}
		});
		console.log(`(${dsp_index}/${dsps.length}) found ${dkimRecords.length} records for DSP ${dsp.domain} ${dsp.selector}`);

		// find duplicates of dkimRecords
		let seen = new Set<string>();
		let duplicates = [];
		for (let i = 0; i < dkimRecords.length; i++) {
			const record = dkimRecords[i];
			if (seen.has(record.value)) {
				duplicates.push(record);
				console.log(`deleting duplicate, value: - ${record.value.slice(0, 20)}`);
				await prisma.dkimRecord.delete({ where: { id: record.id } });
				count++;
			}
			seen.add(record.value);
		}
	}
	console.log(`deleted ${count} records`);
}

main();
