import Archiver from "archiver";
import Discord from "discord.js";
import fs from "fs";
import path from "path";
import FrameworkClient from "strike-discord-framework";
import Logger from "strike-discord-framework/dist/logger.js";

import { GoogleSheetParser, SheetParseResult } from "./parseSheets.js";

const SHEET_ID = "12Fr3aL16m1-uuL3e1R_z4ErUH2lc8dktgpePyUloQHs";

const patrickRate = 1000 * 60 * 60 * 24;

class Application {
	public log: Logger;
	public lastSheetsResult: SheetParseResult;

	constructor(public framework: FrameworkClient) {
		this.log = framework.log;
	}

	public async init() {
		this.log.info(`Application has started!`);

		setInterval(() => {
			this.checkPatrick();
		}, 30000);
	}

	private async checkPatrick() {
		if (!fs.existsSync("../patrick.txt")) return;
		const [lastPatrickTime, patrickIndex] = fs.readFileSync("../patrick.txt", "utf-8").split("\n");
		const lastTime = parseInt(lastPatrickTime);
		const index = parseInt(patrickIndex);
		const currentTime = Date.now();

		if (currentTime - lastTime < patrickRate) return;
		this.log.info(`Patrick time!`);

		const patrickChannel = (await this.framework.client.channels.fetch("1182879117486588018").catch(() => null)) as Discord.TextChannel;
		if (!patrickChannel) return;

		const imageUrl = fs.readdirSync("../patrick")[index];

		patrickChannel.send({
			content: "<@&1182876876860035083> Patrick time!",
			files: [path.resolve(`../patrick/${imageUrl}`)]
		});

		fs.writeFileSync("../patrick.txt", `${currentTime}\n${index + 1}`);
	}

	public async runSheetUpdate() {
		this.log.info("Starting to parse sheets!");
		if (!fs.existsSync("../results")) fs.mkdirSync("../results");
		const parser = new GoogleSheetParser(SHEET_ID, this.framework);
		await parser.init();
		const result = await parser.run();

		if (!result) return;
		this.lastSheetsResult = result;

		this.log.info(`Got sheets result, writing to archive`);
		const { achievementHistory, opAchievementLog, members } = result;

		const archive = Archiver("zip");
		const resultPath = path.resolve(`../results/${new Date().toISOString().split(":").join("")}.zip`);
		const output = fs.createWriteStream(resultPath);
		const completionPromise = new Promise<void>(res =>
			output.on("close", () => {
				res();
			})
		);
		archive.pipe(output);

		archive.append(achievementHistory, { name: "achievements.txt" });
		archive.append(opAchievementLog, { name: "opHistory.txt" });
		Object.keys(members).forEach(member => {
			const name = member.split(" ").join("_");
			archive.append(members[member].history, { name: `${name}.txt` });
		});

		archive.finalize();

		await completionPromise;
		this.log.info("Finished parsing sheets!");

		return resultPath;
	}
}

export { Application };
