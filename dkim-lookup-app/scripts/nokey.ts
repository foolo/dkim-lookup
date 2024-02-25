import { prisma } from "@/lib/db";

async function main() {
	let dsps = await prisma.domainSelectorPair.findMany({
		where: {
			records: {
				none: {
				}
			}
		}
	})
	console.log(`found ${dsps.length} domain/selector pairs with no records`);
}

main();
