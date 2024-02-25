import { prisma } from "@/lib/db";

async function main() {
	let dsps = await prisma.domainSelectorPair.findMany();
	dsps.sort((a, b) => a.domain.localeCompare(b.domain));
	for (let dsp of dsps) {
		console.log(`${dsp.domain}\t${dsp.selector}`);
	}
}

main();
