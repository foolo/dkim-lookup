import { prisma } from "@/lib/db";

async function main() {
	let keys = await prisma.dkimRecord.findMany({ include: { domainSelectorPair: true } });
	console.log(JSON.stringify(keys, null, 2));
}

main();
