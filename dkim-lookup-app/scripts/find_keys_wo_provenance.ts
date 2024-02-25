import { prisma } from "@/lib/db";

async function main() {
	let dsps = await prisma.dkimRecord.findMany({
		where: {
			provenanceVerified: false
		}
	})
	console.log(`found ${dsps.length} domain/selector pairs with no provenance`);
	for (let dsp of dsps) {
		console.log(`#${dsp.id}: ${dsp.value}`);
	}
}

main();
