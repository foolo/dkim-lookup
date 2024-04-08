import { DkimRecord, DomainSelectorPair } from "@prisma/client";
import { getCanonicalRecordString } from "./utils";
import { WitnessClient } from "@witnessco/client";
import { prisma, recordToString } from "./db";

export async function generateWitness(dsp: DomainSelectorPair, dkimRecord: DkimRecord) {
	let canonicalRecordString = getCanonicalRecordString(dsp, dkimRecord.value);
	const witness = new WitnessClient(process.env.WITNESS_API_KEY);
	const leafHash = witness.hash(canonicalRecordString);
	const timestamp = await witness.postLeafAndGetTimestamp(leafHash);
	console.log(`leaf ${leafHash} was timestamped at ${timestamp}`);
	const proof = await witness.getProofForLeafHash(leafHash);
	const verified = await witness.verifyProofChain(proof);
	if (!verified) {
		console.error('proof chain verification failed');
		return;
	}
	console.log(`proof chain verified, setting provenanceVerified for ${recordToString(dkimRecord)}`);
	await prisma.dkimRecord.update({
		where: {
			id: dkimRecord.id
		},
		data: {
			provenanceVerified: true
		}
	});
}
