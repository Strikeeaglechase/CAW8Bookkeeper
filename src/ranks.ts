import { AwardInfoResult } from "./application.js";
import { isDev } from "./index.js";

interface Rank {
	rank: string;
	uOps: number;
	tOps: number;
	roleId: string;
	prefix: string;
}

const devRanks: Rank[] = [
	{ rank: "Recruit", uOps: 0, tOps: 0, roleId: "1287253664355979373", prefix: "" },
	{ rank: "Ensign", uOps: 1, tOps: 1, roleId: "1287253286801375325", prefix: "ENS" },
	{ rank: "Lieutenant Junior Grade", uOps: 2, tOps: 3, roleId: "1287253232329949306", prefix: "LTJG" },
	{ rank: "Lieutenant", uOps: 3, tOps: 6, roleId: "1287254510422589522", prefix: "LT" },
	{ rank: "Lieutenant Commander", uOps: 5, tOps: 8, roleId: "1287254434300297258", prefix: "LCDR" },
	{ rank: "Commander", uOps: 8, tOps: 12, roleId: "1287254461873389599", prefix: "CDR" }
];

const prodRanks = [
	{ rank: "Recruit", uOps: 0, tOps: 0, roleId: "836942889464102923", prefix: "" },
	{ rank: "Ensign", uOps: 1, tOps: 1, roleId: "836942802252202035", prefix: "ENS" },
	{ rank: "Lieutenant Junior Grade", uOps: 2, tOps: 3, roleId: "836942626245967872", prefix: "LTJG" },
	{ rank: "Lieutenant", uOps: 3, tOps: 6, roleId: "1012545396607828092", prefix: "LT" },
	{ rank: "Lieutenant Commander", uOps: 5, tOps: 8, roleId: "926974731872260166", prefix: "LCDR" },
	{ rank: "Commander", uOps: 8, tOps: 12, roleId: "836942371677536277", prefix: "CDR" }
];

export const ranks: Rank[] = isDev ? devRanks : prodRanks;

export function getHighestQualRank(uniqueOps: number, totalOps: number): Rank {
	let highestQualifyRank = ranks[0];
	for (let i = 0; i < ranks.length; i++) {
		if (uniqueOps >= ranks[i].uOps && totalOps >= ranks[i].tOps) {
			highestQualifyRank = ranks[i];
		}
	}

	return highestQualifyRank;
}

export function getHighestQualRankFromInfo(info: AwardInfoResult) {
	const uOpNames: Set<string> = new Set();
	let tOps = 0;
	let uOps = 0;
	info.opsAttended.forEach(op => {
		if (!uOpNames.has(op.name)) {
			uOps++;
			uOpNames.add(op.name);
		}
		tOps++;
	});

	return getHighestQualRank(uOps, tOps);
}
