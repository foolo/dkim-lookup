import { prisma } from "@/lib/db";

async function main() {
	let dkimKeys = await prisma.dkimRecord.findMany({ include: { domainSelectorPair: true } });
	let dspToKeysMap = new Map<string, string[]>();
	for (let dkimKey of dkimKeys) {
		let dsp = `${dkimKey.domainSelectorPair.domain}, ${dkimKey.domainSelectorPair.selector}`;
		let dkimKeysForDsp = dspToKeysMap.get(dsp);
		if (!dkimKeysForDsp) {
			dkimKeysForDsp = [];
			dspToKeysMap.set(dsp, dkimKeysForDsp);
		}
		dkimKeysForDsp.push(dkimKey.value);
	}
	for (let [dsp, dkimKeys] of dspToKeysMap) {
		if (dkimKeys.length > 1) {
			console.log(`found ${dkimKeys.length} keys for ${dsp}`);
			for (let dkimKey of dkimKeys) {
				console.log(dkimKey);
			}
			console.log();
		}
	}
}

main();
