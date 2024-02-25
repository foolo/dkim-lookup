import { prisma } from "@/lib/db";

async function main() {
	let dsps = await prisma.domainSelectorPair.findMany();
	dsps.sort((a, b) => a.selector.localeCompare(b.selector));
	for (let dsp of dsps) {
		if (dsp.selector.includes('2023')) {
			console.log('selector: ' + dsp.selector + ', domain: ' + dsp.domain);
		}
	}
}

main();
