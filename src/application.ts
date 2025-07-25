import { AuditLogEvent, CommandInteraction, EmbedBuilder, GuildMember, InteractionEditReplyOptions, MessagePayload, TextChannel } from "discord.js";
import express from "express";
import fs from "fs";
import { JWT } from "google-auth-library";
import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from "google-spreadsheet";
import path from "path";
import FrameworkClient from "strike-discord-framework";
import { CollectionManager } from "strike-discord-framework/dist/collectionManager.js";
import Logger from "strike-discord-framework/dist/logger.js";
import { v4 as uuidv4 } from "uuid";

import { isDev } from "./index.js";
import { SheetParseResult } from "./parseSheets.js";

const minOpsToPostOnSurvRateScoreboard = 15;
const minWiresToPostOnWireGPAScoreboard = 15;

export const timeslots = [
	"Monday 1200 EST", //
	"Friday 2000 EST",
	"Saturday 1400 EST",
	"Saturday 1600 EST",
	"Sunday 1400 EST",
	"Sunday 1600 EST"
];
const _timeslotColors = {
	"Monday 1200 EST": [255, 229, 153],
	"Friday 2000 EST": [255, 153, 0],
	"Saturday 1400 EST": [164, 194, 244],
	"Saturday 1600 EST": [234, 153, 153],
	"Sunday 1400 EST": [147, 196, 125],
	"Sunday 1600 EST": [255, 229, 153]
};
const timeslotColors: Record<string, { red: number; green: number; blue: number }> = {};
Object.keys(_timeslotColors).forEach(key => {
	timeslotColors[key] = { red: _timeslotColors[key][0] / 255, green: _timeslotColors[key][1] / 255, blue: _timeslotColors[key][2] / 255 };
});

export interface OpUser {
	id: string;
	username: string;
	discordId: string;
	steamId: string;
	leaderboardPositions?: {
		wire: number;
		attendance: number;
		survivalRate: number;
	};
}

interface LeaderboardUserData {
	username: string;
	totalWires: number;
	wireScore: number;
	wireGpa: string;
	opsAttended: number;
	uniqueOpsAttended: number;
	opsAttendedNames: string[];
	opsWithDeaths: number;
	survivalRate: number;
}

export type CompletionType = "Arrested" | "Vertical" | "DNF" | "Airfield" | "Nonpilot" | "NA";
export interface DBOpMember {
	name: string;
	slot: string;
	aircraft: string;
	type: CompletionType;
	combatDeaths: number;
	bolters: number;
	wire: number;
	promotions: string;
	remarks: string;
}

export interface DBOp {
	id: string;
	name: string;
	timeslot: string;

	createdAt: number;
	endedAt: number;

	members: DBOpMember[];
}

export interface OpFLReservations {
	id: string;
	messageId: string;
	channelId: string;
	opName: string;

	reservations: Record<string, Record<string, string>>; // Timeslot: { Slot: Name }
}

export interface OpSlotConfig {
	id: string;
	slot: string;
	slotName: string;
	slotDescription: string;
	aircraft: string;
	opName: string;
}

export interface Award {
	type: "fiveOpsWithoutDeath" | "fiveOpsWithoutBolter";
	afterOpId: string;
}

export interface AwardInfoResult {
	awards: Award[];
	memberName: string;
	fullOpsWithoutDeath: number;
	fullOpsWithoutBolter: number;
	overallTotalOpsWithoutBolter: number;
	overallTotalOpsWithoutDeath: number;
	opsAttended: DBOp[];
}

export interface ScoreboardMessage {
	messageId: string;
	channelId: string;
	guildId: string;
	id: string;
}

export interface AttendanceRecover {
	id: string;
	opId: string;
	userDiscordId: string;
	createdAt: number;
}

export function formatAndValidateSlot(slot: string) {
	if (slot == null || slot.length == 0) return null;
	slot = slot.toUpperCase();
	// Letter number format? A5, B2
	if (slot.length == 2) {
		if (slot.match(/^[A-Z]\d$/)) {
			return slot[0] + "1-" + slot[1];
		} else return null;
	}

	// Letter hyphen number format? A-2, B-5
	if (slot.match(/^[A-Z]-\d$/)) {
		return slot[0] + "1-" + slot[2];
	}

	// Either A12 or A1-2 format
	if (!slot.includes("-")) {
		const start = slot.slice(0, 2);
		const end = slot.slice(2);
		slot = `${start}-${end}`;
	}

	const valid = slot.match(/^[A-Z]\d-\d\d?$/);
	if (!valid) return null;
	return slot;
}

export function replyOrEdit(iter: CommandInteraction, content: string | MessagePayload | InteractionEditReplyOptions) {
	if (iter.replied || iter.deferred) {
		return iter.editReply(content);
	} else {
		return iter.reply(content);
	}
}

export const wireScore = (wire: number) => {
	switch (wire) {
		case 1:
			return 1;
		case 2:
			return 3;
		case 3:
			return 4;
		case 4:
			return 2;
		default:
			return 0;
	}
};

//Returns emoji based on wire caught
export const wireScoreEmoji = (wire: number) => {
	switch (wire) {
		case 1:
			return "🟥";
		case 2:
			return "🟨";
		case 3:
			return "🟩";
		case 4:
			return "🟧";
		default:
			return "❓";
	}
};

export const wireScoreEmojiAvacado = (wire: number) => {
	switch (wire) {
		case 1:
			return "😭";
		case 2:
			return "😄";
		case 3:
			return "😎";
		case 4:
			return "😔";
		default:
			return "❓";
	}
};
interface OldOp {
	timeslot: string;
	name: string;
	members: {
		uniqueName: string;
		callsign: string;
		type: string;
		bolters: string | number;
		wire: string | number;
		lsoGrade: string;
		combatDeaths: number;
		promotions: string;
		remarks: string;
		displayName: string;
	}[];
}

interface Config {
	commandAccessRole: string;
	nicknameNotifyChannel: string;
	mainServerId: string;
	flightLeadRole: string;

	nextChapTime: number;
	nextChapNum: number;

	id: "config";
}

interface UserNicknameEntry {
	id: string;
	nickname: string;
}

class Application {
	public log: Logger;
	public lastSheetsResult: SheetParseResult;

	public ops: CollectionManager<DBOp>;
	public users: CollectionManager<OpUser>;
	public slots: CollectionManager<OpSlotConfig>;
	public reservations: CollectionManager<OpFLReservations>;
	public scoreboardMessages: CollectionManager<ScoreboardMessage>;
	public attendanceRecoveries: CollectionManager<AttendanceRecover>;
	private configDb: CollectionManager<Config>;
	private userNicknames: CollectionManager<UserNicknameEntry>;

	public userSelectedOps: Record<string, string> = {};
	public activeOp: string;
	public opActiveAt: number;

	private api: express.Express;

	// private handledNicknameUpdates: string[] = [];

	constructor(public framework: FrameworkClient) {
		this.log = framework.log;
	}

	public async init() {
		this.log.info(`Application has started!`);
		this.scoreboardMessages = await this.framework.database.collection("scoreboard-messages", false, "id");
		this.attendanceRecoveries = await this.framework.database.collection("attendanceRecoveries", false, "id");
		this.ops = await this.framework.database.collection("ops", false, "id");
		this.slots = await this.framework.database.collection("slots", false, "id");
		this.reservations = await this.framework.database.collection("reservations", false, "id");
		this.users = await this.framework.database.collection("users", false, "id");
		this.configDb = await this.framework.database.collection("config", false, "id");
		this.userNicknames = await this.framework.database.collection("userNicknames", false, "id");

		this.configureApi();

		const serverId = process.env.IS_DEV == "true" ? "1222394236624965643" : "836755485935271966";
		const server = await this.framework.client.guilds.fetch(serverId);
		const members = await server.members.fetch();
		members.forEach(async member => {
			const nickname = member.nickname;
			const entry = await this.userNicknames.collection.findOne({ id: member.id });
			if (!entry) {
				await this.userNicknames.collection.insertOne({ id: member.id, nickname: nickname });
			} else if (entry.nickname != nickname) {
				await this.userNicknames.collection.updateOne({ id: member.id }, { $set: { nickname: nickname } });
			}
		});

		this.framework.client.on("guildMemberUpdate", async (oldMember, newMember) => {
			let prevNicknameEntry: UserNicknameEntry = await this.userNicknames.collection.findOne({ id: newMember.id });
			if (!prevNicknameEntry) {
				await this.userNicknames.collection.insertOne({ id: newMember.id, nickname: newMember.nickname });
				prevNicknameEntry = { id: newMember.id, nickname: newMember.nickname };
			}

			if (oldMember.nickname != newMember.nickname) {
				if (prevNicknameEntry.id == newMember.nickname) return;

				const channelId = (await this.getConfig()).nicknameNotifyChannel;
				if (!channelId) return;
				const channel = newMember.guild.channels.cache.get(channelId) as TextChannel;
				if (!channel) return;

				const embed = new EmbedBuilder();
				embed.setTitle(newMember.user.username);
				embed.setDescription(`Nickname change \`${oldMember.displayName}\` -> \`${newMember.displayName}\``);
				channel.send({ embeds: [embed] });

				await this.userNicknames.collection.updateOne({ id: newMember.id }, { $set: { nickname: newMember.nickname } });
			}
		});

		const ops = await this.ops.collection.find({}).toArray();
		const oOps = JSON.parse(fs.readFileSync("../ops.json", "utf8")) as OldOp[];
		const dayTimeTimeslotMap = {
			SATURDAY1400EST: "Saturday 1400 EST",
			SATURDAY1600EST: "Saturday 1600 EST",
			SUNDAY1400EST: "Sunday 1400 EST",
			SUNDAY1600EST: "Sunday 1600 EST",
			MONDAY1200EST: "Monday 1200 EST",
			FRIDAY2000EST: "Friday 2000 EST"
		};

		ops.forEach(async newOp => {
			if (!newOp.createdAt) {
				const oOpEntry = oOps.find(op => {
					const match = op.timeslot.match(/(\w+) ([\w\d]+)/);
					const [_, day, time] = [...match];
					const key = day + time;
					const slot = dayTimeTimeslotMap[key];
					return op.name.includes(newOp.name) && newOp.timeslot == slot;
				});
				if (!oOpEntry) return;

				const match = oOpEntry.timeslot.match(/(\w+) ([\w\d]+)/);
				const [_, day, time] = [...match];
				const date = oOpEntry.name.match(/EST,? (.+)/)[1];

				const dateTime = new Date(`${date} ${time}`);
				// newOp.createdAt = dateTime.getTime();
				// newOp.endedAt = dateTime.getTime();
				await this.ops.collection.updateOne({ id: newOp.id }, { $set: { createdAt: dateTime.getTime(), endedAt: dateTime.getTime() } });
				// console.log(`Op ${newOp.name} has no createdAt, oOp: ${oOpEntry}`);
			}
		});

		// const oldOps = JSON.parse(fs.readFileSync("../ops.json", "utf8")) as OldOp[];

		// const opUsersToAdd: OpUser[] = [];
		// dbOps.forEach(op => {
		// 	op.members.forEach(member => {
		// 		const existingUser = opUsersToAdd.find(u => u.username == member.name);
		// 		if (!existingUser) {
		// 			opUsersToAdd.push({ id: uuidv4(), username: member.name, discordId: null });
		// 		}
		// 	});
		// });
		// await Promise.all(
		// 	opUsersToAdd.map(async u => {
		// 		const existing = await this.users.collection.findOne({ username: u.username });
		// 		if (!existing) await this.users.add(u);
		// 	})
		// );
		//
		// await Promise.all(
		// 	dbOps.map(async op => {
		// 		const existing = await this.ops.collection.findOne({ name: op.name, timeslot: op.timeslot });
		// 		if (!existing) await this.ops.add(op);
		// 	})
		// );

		const allUsers = await this.users.collection.find({}).toArray();
		let totalOpsAttended = 0;
		allUsers.forEach(u => {
			const opsAttended = ops.filter(op => op.members.find(m => m.name == u.username));
			totalOpsAttended += opsAttended.length;
		});
		console.log(`Total ops attended: ${totalOpsAttended}`);
		console.log(`Average ops attended: ${totalOpsAttended / allUsers.length}`);

		if (!isDev) {
			const config = await this.getConfig();
			if (!config.nextChapTime) {
				config.nextChapTime = new Date("2024-12-01T05:00:00.000Z").getTime();
				config.nextChapNum = 0;
				const delta = (config.nextChapTime - Date.now()) / 1000 / 60;
				console.log(`Next chap time is in ${delta} minutes`);
				await this.setConfig(config);
			}

			this.log.info(`Next chap time: ${new Date(config.nextChapTime).toLocaleString()}, ${config.nextChapTime - Date.now()}ms`);
			setTimeout(() => this.runChapTime(), config.nextChapTime - Date.now());
		}

		// const chapPics = fs.readdirSync("../chaperone");
		// console.log(`Found ${chapPics.length} chaperone pics`);
		// const randomized: string[] = [];
		// while (chapPics.length > 0) {
		// 	const idx = Math.floor(Math.random() * chapPics.length);
		// 	randomized.push(chapPics.splice(idx, 1)[0]);
		// }

		// randomized.forEach((pic, idx) => {
		// 	console.log(`Renaming ${pic} to chaperone${idx}.png`);
		// 	fs.renameSync(`../chaperone/${pic}`, `../chaperone/chaperone${idx}.png`);
		// });
		this.updateScoreboards();
		const scoreboardUpdateRate = process.env.IS_DEV == "true" ? 1000 * 10 : 1000 * 60 * 60; // 10 seconds in dev, 1 hour in prod
		setInterval(() => this.updateScoreboards(), scoreboardUpdateRate);
	}

	private async runChapTime() {
		this.log.info(`Chap time!`);
		const guild = await this.framework.client.guilds.fetch("836755485935271966");
		const channel = (await guild.channels.fetch("1312636775373606952")) as TextChannel;
		const config = await this.getConfig();
		const imagePath = `../chaperone/chaperone${config.nextChapNum}.png`;

		channel.send({
			content: `<@&1182876876860035083> Chaperone time!`,
			files: [path.resolve(imagePath)]
		});

		const nextTime = Date.now() + 1000 * 60 * 60 * 24;
		config.nextChapTime = nextTime;
		config.nextChapNum++;
		await this.setConfig(config);
		this.log.info(`Next chap time: ${new Date(config.nextChapTime).toLocaleString()}, ${config.nextChapTime - Date.now()}ms`);
		setTimeout(() => this.runChapTime(), config.nextChapTime - Date.now());
	}

	private async configureApi() {
		this.api = express();
		this.api.get("/user/:id", async (req, res) => {
			const user = await this.users.collection.findOne({ steamId: req.params.id });
			if (!user) {
				res.sendStatus(404);
				return;
			}

			const isAuthed = await this.isUserAuthed(user);
			const userAwards = await this.calcOpAwards(user.username);
			const result = {
				user: user,
				isAuthed: isAuthed,
				awards: userAwards
			};
			res.json(result);
		});

		this.api.get("/check_timed_out/:id", async (req, res) => {
			const guild = await this.framework.client.guilds.fetch("836755485935271966");
			const targetUser = await guild.members.fetch(req.params.id).catch((): null => null);
			if (!targetUser) {
				console.log(`User not found`);
				res.sendStatus(404);
				return;
			}

			if (!targetUser.communicationDisabledUntil || targetUser.communicationDisabledUntil.getTime() < Date.now()) {
				console.log(`User not timed out`);
				res.json({ timedOutBy: null });
				return;
			}

			const audit = await guild.fetchAuditLogs();
			const timeoutAction = audit.entries.find(e => {
				if (!e.target || e.target.id != targetUser.id || e.action != AuditLogEvent.MemberUpdate) return;
				const changes = e.changes.find(c => c.key == "communication_disabled_until");
				if (!changes) return false;

				const td = new Date(changes.new as string).getTime() - targetUser.communicationDisabledUntil.getTime();
				return td == 0;
			});

			if (!timeoutAction) {
				console.log(`No timeout action found`);
				res.sendStatus(500);
				return;
			}

			res.json({ timedOutBy: timeoutAction.executor.id });
		});

		this.api.get("/health", (req, res) => {
			res.sendStatus(200);
		});

		this.api.get("/cawlogo.png", (req, res) => {
			const filePath = path.resolve("../CAWLOGO.png");
			if (!fs.existsSync(filePath)) {
				this.log.error(`CAWLOGO.png not found at ${filePath}`);
				res.sendStatus(404);
				return;
			}
			res.sendFile(filePath);
		});

		this.api.listen(parseInt(process.env.PORT), () => {
			this.log.info(`API listening on port ${process.env.PORT}`);
		});
	}

	private async loadOldOp(op: OldOp) {
		const match = op.timeslot.match(/(\w+) ([\w\d]+)/);
		const [_, day, time] = [...match];

		const idx = op.name.indexOf(day);
		const name = idx == -1 ? op.name : op.name.slice(0, idx).trim();

		if (!name.startsWith("OP: ") && !name.startsWith("EX: ")) return;
		const pureName = name.slice(4).trim();
		let opIsInvalid = false;

		const dbOpMembers = op.members
			.map(member => {
				let bolters = member.bolters;
				let completion: CompletionType = "Arrested";
				let memberValid = true;

				if (member.displayName == "DO NOT REMOVE") memberValid = false;
				if (member.displayName == null || member.displayName.trim().length == 0) memberValid = false;

				switch (member.callsign) {
					case "EWO":
					case "Gunner":
					case "CPG":
					case "WSO":
					case "- WSO":
					case "WIZARD":
						completion = "Nonpilot";
						break;

					case "REDFOR":
					case "REDFOR 11":
					case "REDFOR 12":
						completion = "NA";
						break;

					case null:
						memberValid = false;
						break;

					default:
						const isTypical = member.callsign.match(/^\w\d\d$/);
						if (!isTypical) {
							memberValid = false;
						}
				}

				if (typeof member.bolters != "number") {
					switch (member.bolters) {
						case "DNF":
							completion = "DNF";
							break;

						case "VERT":
							completion = "Vertical";
							break;

						case "WSO":
						case "Gunner":
						case "WIZARD":
						case "EWO":
						case "LSO":
							completion = "Nonpilot";
							break;

						case "AIR FIELD":
							completion = "Airfield";
							break;

						case "VTOL":
							completion = "Vertical";
							break;

						case "N/A":
						case "REDFOR":
						case null:
							completion = "NA";
							break;

						default:
							console.log(`Unknown bolter type: ${member.bolters}`);
					}
					bolters = null;
				}

				if (typeof member.wire != "number" && completion == "Arrested") {
					switch (member.wire) {
						case "DNF":
							completion = "DNF";
							break;
						case "VTOL":
						case "VERT":
							completion = "Vertical";
							break;

						case "LSO":
							completion = "Nonpilot";
							break;

						case "N/A":
						case null:
							completion = "NA";
							break;

						default:
							console.log(`Unknown wire type: ${member.wire}`);
					}

					member.wire = null;
				}

				if (typeof member.combatDeaths != "number" && completion != "Nonpilot" && completion != "DNF") {
					switch (member.combatDeaths) {
						// console.log(member, op.name);
						case "Gunner":
						case "EWO":
						case "WIZARD":
						case "CPG":
						case "WSO":
							completion = "Nonpilot";
							break;

						case "REDFOR":
						case "N/A":
							completion = "NA";
							break;

						case undefined:
							opIsInvalid = true;
							break;

						default:
							member.combatDeaths = 0;
						// console.log(`Unknown combat deaths: ${member.combatDeaths}`);
						// console.log(member);
						// console.log(op.name);
					}

					if (typeof member.combatDeaths != "number") member.combatDeaths = null;
				}

				if (opIsInvalid || !memberValid) return null;

				if (completion != "Arrested") {
					bolters = null;
					member.wire = null;
				}

				if (typeof member.combatDeaths != "number") member.combatDeaths = null;

				const isNormCallsign = member.callsign.match(/^\w\d\d$/);
				if (!isNormCallsign) {
					member.callsign = null;
				}

				const acMap = {
					"AV-42": "AV-42C",
					"AV-42C": "AV-42C",
					"F/A-26B": "F/A-26B",
					"F-45A": "F-45A",
					"AH-94": "AH-94",
					"T-55": "T-55",
					"EF-24G": "EF-24G",
					"WSO": "T-55",
					"Gunner": "AH-94",
					"F-14A+": "F/A-26B",
					"F-117N": "F-45A",
					"F/A-18C": "T-55",
					"F/A-18D": "T-55",
					"AH-1W": "AH-94",
					"F/A-26J": "F/A-26B"
				};

				if (member.type != null) {
					const ac = acMap[member.type];
					if (member.type in acMap) {
						member.type = ac;
					}
				}

				const dbMember: DBOpMember = {
					name: member.displayName,
					slot: formatAndValidateSlot(member.callsign),
					aircraft: member.type,
					type: completion,
					combatDeaths: member.combatDeaths,
					bolters: bolters as number,
					wire: member.wire as number,
					promotions: member.promotions,
					remarks: member.remarks
				};

				return dbMember;
			})
			.filter(m => m != null);

		if (opIsInvalid) return;

		const dayTimeTimeslotMap = {
			SATURDAY1400EST: "Saturday 1400 EST",
			SATURDAY1600EST: "Saturday 1600 EST",
			SUNDAY1400EST: "Sunday 1400 EST",
			SUNDAY1600EST: "Sunday 1600 EST",
			MONDAY1200EST: "Monday 1200 EST",
			FRIDAY2000EST: "Friday 2000 EST"
		};
		let timeKey = day + time;
		if (!(timeKey in dayTimeTimeslotMap)) {
			timeKey = day;
		}

		if (!(timeKey in dayTimeTimeslotMap)) {
			console.log(`Invalid timeslot: ${timeKey}`);
			return;
		}

		const timeslot = dayTimeTimeslotMap[timeKey];
		const dbOp: DBOp = {
			id: uuidv4(),
			members: dbOpMembers,
			name: pureName,
			timeslot: timeslot,

			createdAt: Date.now(),
			endedAt: null
		};

		const opUsersToAdd: OpUser[] = [];
		dbOp.members.forEach(member => {
			const existingUser = opUsersToAdd.find(u => u.username == member.name);
			if (!existingUser) {
				opUsersToAdd.push({ id: uuidv4(), username: member.name, discordId: null, steamId: null });
			}
		});

		await Promise.all(
			opUsersToAdd.map(async u => {
				const existing = await this.users.collection.findOne({ username: u.username });
				if (!existing) await this.users.add(u);
			})
		);

		const existing = await this.ops.collection.findOne({ name: dbOp.name, timeslot: dbOp.timeslot });
		if (!existing) await this.ops.add(dbOp);
	}

	public async importOp(sheetName: string): Promise<string> {
		const jwt = this.loadCreds();
		const doc = new GoogleSpreadsheet(process.env.INGEST_SHEET_ID, jwt);
		await doc.loadInfo();
		this.log.info(`Loaded document: ${doc.title}`);

		const targetSheet = doc.sheetsByIndex.find(s => s.title.toLowerCase() == sheetName.toLowerCase());
		if (!targetSheet) return `Sheet \`${sheetName}\` was not found`;

		await targetSheet.loadCells();

		const opName = targetSheet.getCell(0, 0).value as string;
		const oOps: OldOp[] = [];
		for (let startCell = 1; startCell < 115; startCell += 19) {
			const timeslot = targetSheet.getCell(startCell, 0).value as string;
			const oldOpEntry: OldOp = {
				name: opName,
				timeslot: timeslot,
				members: []
			};

			for (let i = 0; i < 16; i++) {
				const name = targetSheet.getCell(startCell + 2 + i, 0).value as string;
				const callsign = targetSheet.getCell(startCell + 2 + i, 1).value as string;
				const type = targetSheet.getCell(startCell + 2 + i, 2).value as string;
				const bolters = targetSheet.getCell(startCell + 2 + i, 3).value as string | number;
				const wire = targetSheet.getCell(startCell + 2 + i, 4).value as string | number;
				const lsoGrade = targetSheet.getCell(startCell + 2 + i, 6).value as string;
				const combatDeaths = targetSheet.getCell(startCell + 2 + i, 7).value as number;
				const promotions = targetSheet.getCell(startCell + 2 + i, 8).value as string;
				const remarks = targetSheet.getCell(startCell + 2 + i, 9).value as string;

				if (!name) continue;
				oldOpEntry.members.push({
					displayName: name,
					uniqueName: name,
					callsign: callsign,
					type: type,
					bolters: bolters,
					wire: wire,
					lsoGrade: lsoGrade,
					combatDeaths: combatDeaths,
					promotions: promotions,
					remarks: remarks
				});
			}

			if (oldOpEntry.members.length > 0) oOps.push(oldOpEntry);
		}

		for (const op of oOps) {
			await this.loadOldOp(op);
		}

		return null;
	}

	public async getConfig() {
		const config = await this.configDb.collection.findOne({ id: "config" });
		if (config) return config;
		const newConfig: Config = {
			id: "config",
			commandAccessRole: null,
			nicknameNotifyChannel: null,
			mainServerId: null,
			flightLeadRole: null,
			nextChapTime: Date.now(),
			nextChapNum: 1
		};

		await this.configDb.add(newConfig);
		return newConfig;
	}

	public async setConfig(config: Config) {
		await this.configDb.update(config, "config");
	}

	public async isAuthed(interaction: CommandInteraction) {
		const config = await this.getConfig();
		if (!config.commandAccessRole) {
			await interaction.reply(this.framework.error("No command access role set in config", true));
			return false;
		}
		if (!(interaction.member instanceof GuildMember)) {
			await interaction.reply(this.framework.error("This command can only be run in a guild", true));
			return false;
		}

		const hasRole = interaction.member.roles.cache.has(config.commandAccessRole);
		if (!hasRole) {
			await interaction.reply(this.framework.error("You do not have permission to run this command", true));
			return false;
		}

		return true;
	}

	public async isFlightLead(interaction: CommandInteraction) {
		const config = await this.getConfig();
		if (!config.flightLeadRole) {
			await interaction.reply(this.framework.error("No flight lead role set in config", true));
			return false;
		}

		if (!(interaction.member instanceof GuildMember)) {
			await interaction.reply(this.framework.error("This command can only be run in a guild", true));
			return false;
		}

		const hasRole = interaction.member.roles.cache.has(config.flightLeadRole);
		if (!hasRole) {
			await interaction.reply(this.framework.error("You do not have permission to run this command", true));
			return false;
		}

		return true;
	}

	public async isUserAuthed(user: OpUser): Promise<boolean> {
		const config = await this.getConfig();
		if (!config.commandAccessRole || !config.mainServerId) return false;
		const server = await this.framework.client.guilds.fetch(config.mainServerId);
		const member = await server.members.fetch(user.discordId).catch(() => null);
		if (!member) return false;

		return member.roles.cache.has(config.commandAccessRole);
	}

	public async createUser(name: string, discordId: string = null) {
		const newUserObj: OpUser = {
			id: uuidv4(),
			username: name,
			discordId: discordId,
			steamId: null
		};

		await this.users.add(newUserObj);
		return newUserObj;
	}

	public async getUserByDiscordId(discordId: string) {
		return await this.users.collection.findOne({ discordId: discordId });
	}

	public table(data: (string | number)[][], tEntryMaxLen = 32) {
		const widths = data[0].map((_, i) => Math.max(...data.map(row => String(row[i]).length)));
		return data.map(row => row.map((val, i) => String(val).padEnd(widths[i]).substring(0, tEntryMaxLen)).join(" "));
	}

	public sortOpMembers(op: DBOp) {
		const opMemberDefaultIndexMap: Record<string, number> = {};
		op.members.forEach((member, idx) => (opMemberDefaultIndexMap[member.name] = idx));

		op.members.sort((a, b) => {
			if (!a.slot || !b.slot) {
				const idxA = opMemberDefaultIndexMap[a.name];
				const idxB = opMemberDefaultIndexMap[b.name];
				return idxA - idxB;
			}

			if (a.slot == b.slot) {
				return a.type == "Nonpilot" ? 1 : -1;
			}

			return a.slot.localeCompare(b.slot);
		});
	}

	public async createOpDisplayEmbed(op: DBOp) {
		const embed = new EmbedBuilder();
		embed.setTitle(`${op.name} | ${op.timeslot}`);
		const membersGrid: (string | number)[][] = [["Callsign", "Name", "Aircraft", "Bolters", "Wire", "Deaths"]];
		const remarksPromotions: (string | number)[][] = [["Name", "Promotions", "Remarks"]];
		const aceIndexes: number[] = [];

		this.sortOpMembers(op);

		op.members.forEach((member, idx) => {
			const btRtx = member.bolters ?? "Missing Data";
			const wireRtx = member.wire ?? "Missing Data";

			const bolterText = member.type == "Arrested" ? btRtx : member.type;
			const wireText = member.type == "Arrested" ? wireRtx : member.type;

			membersGrid.push([member.slot ?? "???", member.name, member.aircraft ?? "^^^", bolterText, wireText, member.combatDeaths ?? "N/A"]);
			if (member.promotions || member.remarks) remarksPromotions.push([member.name, member.promotions ?? "-", member.remarks?.trim() ?? "-"]);

			if (member.bolters == 0 && member.combatDeaths == 0 && member.wire == 3) aceIndexes.push(idx);
		});

		const memberTable = this.table(membersGrid);
		memberTable[0] = `[2;37m[1;37m` + memberTable[0] + `[0m[2;37m[0m`;
		aceIndexes.forEach(aceIdx => {
			memberTable[aceIdx + 1] = `[2;33m` + memberTable[aceIdx + 1] + `[0m`;
		});

		const membersText = "**Attendance:** ```ansi\n" + memberTable.join("\n") + "\n```";
		const remarksPromotionsText = "**Remarks and Promotions:** ```\n" + this.table(remarksPromotions, 256).join("\n") + "\n```";

		const awards = await Promise.all(op.members.map(m => this.calcOpAwards(m.name)));
		const awardsThisOp = awards.filter(a => {
			a.awards = a.awards.filter(award => award.afterOpId == op.id);
			return a.awards.length > 0;
		});

		let awardsText = "";
		if (awardsThisOp.length > 0) {
			awardsText = "\n\n**Awards: **";
			awardsThisOp.forEach(award => {
				award.awards.forEach(a => {
					const aName = a.type == "fiveOpsWithoutDeath" ? "Five Ops Without Death" : "Five Ops Without Bolter";
					awardsText += `\n\n**${award.memberName} achieved ${aName}!**`;
				});
			});
		}

		embed.setDescription(membersText + "\n\n" + remarksPromotionsText + awardsText);

		return embed;
	}

	public async calcOpAwards(memberName: string): Promise<AwardInfoResult> {
		const opsAttended = await this.ops.collection.find({ "members.name": memberName }).toArray();
		const awards: Award[] = [];

		let opsWithoutDeath = 0;
		let opsWithoutBolter = 0;
		let fullOpsWithoutDeath = 0;
		let fullOpsWithoutBolter = 0;
		let overallTotalOpsWithoutDeath = 0;
		let overallTotalOpsWithoutBolter = 0;

		opsAttended.sort((a, b) => a.createdAt - b.createdAt);

		opsAttended.forEach(op => {
			const member = op.members.find(m => m.name == memberName);

			if (member.combatDeaths !== null) {
				const didCompleteOp = member.type == "Airfield" || member.type == "Vertical" || member.type == "Arrested";
				if (member.combatDeaths == 0 && didCompleteOp) {
					opsWithoutDeath++;
					fullOpsWithoutDeath++;
					overallTotalOpsWithoutDeath++;
				} else if (member.combatDeaths > 0) {
					opsWithoutDeath = 0;
					fullOpsWithoutDeath = 0;
				}
			}

			if (member.bolters !== null) {
				if (member.type == "Arrested") {
					if (member.bolters == 0) {
						opsWithoutBolter++;
						fullOpsWithoutBolter++;
						overallTotalOpsWithoutBolter++;
					} else {
						opsWithoutBolter = 0;
						fullOpsWithoutBolter = 0;
					}
				}
			}

			if (opsWithoutDeath >= 5) {
				awards.push({ type: "fiveOpsWithoutDeath", afterOpId: op.id });
				opsWithoutDeath = 0;
			}

			if (opsWithoutBolter >= 5) {
				awards.push({ type: "fiveOpsWithoutBolter", afterOpId: op.id });
				opsWithoutBolter = 0;
			}
		});

		return { awards, memberName, fullOpsWithoutDeath, fullOpsWithoutBolter, overallTotalOpsWithoutBolter, overallTotalOpsWithoutDeath, opsAttended };
	}

	public async getReservations(opName: string) {
		const res = await this.reservations.collection.findOne({ opName: opName });
		if (res) return res;

		const newRes: OpFLReservations = {
			id: uuidv4(),
			messageId: null,
			channelId: null,
			opName: opName,
			reservations: {}
		};

		await this.reservations.add(newRes);

		return newRes;
	}

	public async updateReservationsMessage(opName: string) {
		const res = await this.getReservations(opName);
		if (!res.messageId || !res.channelId) return;
		const ops = await this.ops.collection.find({ name: opName }).toArray();
		const slots = await this.slots.collection.find({ opName: opName }).toArray();

		const channel = await this.framework.client.channels.fetch(res.channelId).catch(e => null);
		if (!(channel instanceof TextChannel)) return;

		const message = await channel.messages.fetch(res.messageId).catch((e): null => null);
		if (!message) return;

		const embed = new EmbedBuilder();
		embed.setTitle(`Reservations for ${opName}`);
		ops.forEach(op => {
			let text = `\`\`\`\n`;
			const acPad = Math.max(...slots.map(s => s.aircraft.length));
			const slotPad = Math.max(...slots.map(s => s.slotName.length)) + 4;

			slots.forEach(slot => {
				const reserved = res.reservations[op.timeslot]?.[slot.slot];
				const ac = slot.aircraft.padEnd(acPad, " ");
				const slotName = `${slot.slotName} 1-1`.padEnd(slotPad, " ");
				text += `${ac} ${slotName} - ${reserved ?? "Open"}\n`;
			});

			text += `\`\`\``;

			embed.addFields({ name: op.timeslot, value: text });
		});

		message.edit({ embeds: [embed], content: "" });
	}

	private loadCreds() {
		const creds = JSON.parse(fs.readFileSync("../caw8-creds.json", "utf8"));

		const SCOPES = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive.file"];

		const jwt = new JWT({
			email: creds.client_email,
			key: creds.private_key,
			scopes: SCOPES
		});

		return jwt;
	}

	public async uploadOpsToSheet(ops: DBOp[]): Promise<string> {
		if (ops.length == 0) return "No ops to upload";
		if (ops.length > 6) return "Too many ops to upload at once";

		const jwt = this.loadCreds();
		const doc = new GoogleSpreadsheet(process.env.SHEET_ID, jwt);
		await doc.loadInfo();
		this.log.info(`Loaded document: ${doc.title}`);

		let sheet: GoogleSpreadsheetWorksheet;
		const existingSheet = doc.sheetsByIndex.find(s => s.title == ops[0].name);
		if (existingSheet) {
			// Check if its one we are allowed to edit
			await existingSheet.loadCells("K2");
			const cell = existingSheet.getCellByA1("K2");
			if (cell.value != "Bot Controlled")
				return `Sheet ${ops[0].name} is not marked as being allowed to be edited by the bot. Set \`K2\` to \`Bot Controlled\``;
			else sheet = existingSheet;
		}

		if (!existingSheet) {
			const templateSheet = doc.sheetsByIndex.find(s => s.title == "Template");
			if (!templateSheet) return "No template sheet found";
			const newSheet = await templateSheet.duplicate({ title: ops[0].name });
			this.log.info(`Created new sheet: ${newSheet.title}`);
			sheet = newSheet;
		}

		await sheet.loadCells();

		// Set title
		const cell = sheet.getCell(0, 0);
		cell.value = ops[0].name;
		for (let i = 0; i < 14; i++) {
			const cell = sheet.getCell(0, i);
			cell.textFormat = { fontSize: 24, foregroundColor: { red: 1, green: 1, blue: 1 } };
			cell.backgroundColor = { red: 0, green: 0, blue: 0 };
		}

		const proms = ops.map(async (op, oIdx) => {
			const startRow = 1 + oIdx * 19;
			await sheet.mergeCells(
				{
					startRowIndex: startRow,
					endRowIndex: startRow + 1,
					startColumnIndex: 0,
					endColumnIndex: 10,
					sheetId: sheet.sheetId
				},
				"MERGE_ALL"
			);
			const cell = sheet.getCell(startRow, 0);
			cell.value = op.timeslot;
			cell.textFormat = { fontSize: 10, foregroundColor: { red: 0, green: 0, blue: 0 } };
			cell.backgroundColor = timeslotColors[op.timeslot];

			const header = ["Name", "Callsign", "Type", "Bolters", "Wire No.", "Wire Score", "LSO Grade", "Combat Deaths", "Promotions", "Remarks"];
			const writeCell = (row: number, col: number, value: string | number) => {
				const cell = sheet.getCell(row, col);
				if (value == null) value = "null";
				cell.value = value;
				return cell;
			};

			header.forEach((h, i) => {
				const cell = writeCell(startRow + 1, i, h);
				cell.horizontalAlignment = "CENTER";
			});

			this.sortOpMembers(op);

			op.members.forEach((member, mIdx) => {
				const row = startRow + 2 + mIdx;
				writeCell(row, 0, member.name);
				writeCell(row, 1, member.slot);
				writeCell(row, 2, member.aircraft);
				writeCell(row, 3, member.bolters ?? member.type);
				writeCell(row, 4, member.wire ?? member.type);
				writeCell(row, 5, member.wire ? wireScore(member.wire) : "N/A");
				writeCell(row, 6, "");
				writeCell(row, 7, member.combatDeaths ?? 0);
				writeCell(row, 8, member.promotions ?? "");
				writeCell(row, 9, member.remarks ?? "");
			});
		});

		await Promise.all(proms);

		sheet.saveUpdatedCells();
	}

	private leaderboardMessage(leaderboardUsers: Record<string, LeaderboardUserData>, leaderboardLength: number) {
		const attendenceTable: (string | number)[][] = [["#", "Username", "Ops Attended", "Unique Ops Attended"]];
		const wireTable: (string | number)[][] = [["#", "Username", "Wire GPA", "Total Wires"]];
		const survRateTable: (string | number)[][] = [["#", "Username", "Survived %", "Ops Attended", "Ops Survived"]];
		const leaderboardUsersArray = Object.values(leaderboardUsers).sort((a, b) => b.opsAttended - a.opsAttended);

		leaderboardUsersArray.forEach((user, idx) => {
			if (idx < leaderboardLength) {
				attendenceTable.push([idx + 1, user.username, user.opsAttended, user.uniqueOpsAttended]);
			}
			this.users.collection.updateOne({ username: user.username }, { $set: { "leaderboardPositions.attendance": idx + 1 } }).catch(e => {
				this.log.error(`Failed to update attendance leaderboard position for ${user.username}: ${e}`);
			});
		});

		const leaderboardUsersArraySortedByWire = Object.values(leaderboardUsers).sort((a, b) => parseFloat(b.wireGpa) - parseFloat(a.wireGpa));

		let wireLdbIdx = 0;
		let widx = 0;
		leaderboardUsersArraySortedByWire.forEach((user, idx) => {
			if (user.totalWires < minWiresToPostOnWireGPAScoreboard) return;
			if (wireLdbIdx < leaderboardLength) {
				wireTable.push([wireLdbIdx + 1, user.username, user.wireGpa, user.totalWires]);
				wireLdbIdx++;
			}
			this.users.collection.updateOne({ username: user.username }, { $set: { "leaderboardPositions.wire": widx + 1 } }).catch(e => {
				this.log.error(`Failed to update wire leaderboard position for ${user.username}: ${e}`);
			});
			widx++;
		});

		wireTable.sort((a, b) => (typeof a[2] === "number" && typeof b[2] === "number" ? b[2] - a[2] : 0));
		const attendenceText = this.table(attendenceTable, 32).join("\n");
		const wireText = this.table(wireTable, 32).join("\n");

		const survRateTableSorted = Object.values(leaderboardUsers).sort((a, b) => b.survivalRate - a.survivalRate);

		let sidx = 0;
		let survRateLdbIdx = 0;
		survRateTableSorted.forEach((user, idx) => {
			if (user.opsAttended < minOpsToPostOnSurvRateScoreboard) return;
			if (survRateLdbIdx < leaderboardLength) {
				survRateTable.push([
					survRateLdbIdx + 1,
					user.username,
					user.survivalRate.toFixed(2) + "%",
					user.opsAttended,
					user.opsAttended - user.opsWithDeaths
				]);
				survRateLdbIdx++;
			}
			this.users.collection.updateOne({ username: user.username }, { $set: { "leaderboardPositions.survivalRate": sidx + 1 } }).catch(e => {
				this.log.error(`Failed to update survival rate leaderboard position for ${user.username}: ${e}`);
			});
			sidx++;
		});

		const emebedDescription = `**Ops Attended:** \`\`\`ansi\n${attendenceText}\n\`\`\`\n\n**Wire GPA:** \`\`\`${wireText}\n\`\`\`\n\n**Survival Rate:** \`\`\`${this.table(
			survRateTable,
			32
		).join("\n")}\n\`\`\``;
		return emebedDescription;
	}

	private async createScoreboardMessage() {
		const embed = new EmbedBuilder({});

		const ops = await this.ops.collection.find({}).toArray();
		const leaderboardUsers: Record<string, LeaderboardUserData> = {};
		ops.forEach(op => {
			op.members.forEach(member => {
				if (!leaderboardUsers[member.name]) {
					leaderboardUsers[member.name] = {
						username: member.name,
						opsAttended: 0,
						uniqueOpsAttended: 0,
						wireScore: 0,
						totalWires: 0,
						wireGpa: "0",
						opsAttendedNames: [],
						opsWithDeaths: 0,
						survivalRate: 0
					};
				}

				leaderboardUsers[member.name].opsAttended++;
				leaderboardUsers[member.name].opsAttendedNames.push(op.name);
				if (member.combatDeaths > 0) {
					leaderboardUsers[member.name].opsWithDeaths++;
				}
				leaderboardUsers[member.name].survivalRate =
					((leaderboardUsers[member.name].opsAttended - leaderboardUsers[member.name].opsWithDeaths) / leaderboardUsers[member.name].opsAttended) * 100;

				if (member.wire) {
					leaderboardUsers[member.name].wireScore += wireScore(member.wire);
					leaderboardUsers[member.name].totalWires++;
					leaderboardUsers[member.name].totalWires += member.bolters ?? 0;
					leaderboardUsers[member.name].wireGpa = (leaderboardUsers[member.name].wireScore / leaderboardUsers[member.name].totalWires).toFixed(2);
				}
				leaderboardUsers[member.name].uniqueOpsAttended = new Set(leaderboardUsers[member.name].opsAttendedNames).size;
			});
		});
		const desiredLeaderboardLength = 30;

		let leaderboardLength = desiredLeaderboardLength;
		let emebedDescription = this.leaderboardMessage(leaderboardUsers, leaderboardLength);
		while (emebedDescription.length > 4000 && leaderboardLength > 1) {
			leaderboardLength--;
			emebedDescription = this.leaderboardMessage(leaderboardUsers, leaderboardLength);
		}

		embed.setDescription(emebedDescription);
		embed.setFooter({ text: `Top ${leaderboardLength} users since 23 July 2023\n ` });
		embed.setTimestamp();
		embed.setAuthor({
			name: "CAW-8 Attendance and Wire GPA Leaderboards",
			iconURL: "https://book.caw8.net/cawlogo.png"
		});
		return embed;
	}

	private async updateScoreboards() {
		const scoreboards = await this.scoreboardMessages.get();
		const embed = await this.createScoreboardMessage();
		const proms = scoreboards.map(async scoreboard => {
			const channel = (await this.framework.client.channels.fetch(scoreboard.channelId).catch(() => {})) as unknown as TextChannel;
			if (!channel) return;
			const msg = await channel.messages.fetch(scoreboard.messageId).catch(() => {});
			if (!msg) return;

			await msg.edit({ embeds: [embed] }).catch(e => {
				this.log.warn(`Unable to update scoreboard: ${e}`);
				console.log(e);
			});
		});

		await Promise.all(proms);
	}

	public async createScoreboard(interaction: CommandInteraction) {
		const emb = new EmbedBuilder({ title: "Scoreboard" });
		const msg = await interaction.channel.send({ embeds: [emb] }).catch(() => {});
		if (!msg) {
			this.log.error(`Unable to send message in channel ${interaction.channel.id}`);
			return;
		}

		const scoreboard: ScoreboardMessage = {
			messageId: msg.id,
			channelId: msg.channel.id,
			guildId: msg.guild.id,
			id: uuidv4()
		};
		await this.scoreboardMessages.add(scoreboard);

		this.log.info(`Created new scoreboard ${scoreboard.id} (${scoreboard.messageId}) in channel ${scoreboard.channelId} in guild ${scoreboard.guildId}`);
		return scoreboard;
	}

	public async deleteScoreboard(scoreboard: ScoreboardMessage) {
		const channel = (await this.framework.client.channels.fetch(scoreboard.channelId).catch(() => {})) as unknown as TextChannel;
		if (channel) {
			const msg = await channel.messages.fetch(scoreboard.messageId).catch(() => {});
			if (msg) {
				await msg.delete().catch(() => {});
			} else {
				this.log.warn(`Could not find message ${scoreboard.messageId} in channel ${scoreboard.channelId} for deletion`);
			}
		} else {
			this.log.warn(`Could not find channel ${scoreboard.channelId} for deletion`);
		}

		this.log.info(`Deleting scoreboard ${scoreboard.id}`);
		await this.scoreboardMessages.remove(scoreboard.id);
	}
}
export { Application };
