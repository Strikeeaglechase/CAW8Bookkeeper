import "reflect-metadata";

import { Intents, IntentsString } from "discord.js";
import { config as dotenvConfig } from "dotenv";
import FrameworkClient from "strike-discord-framework";
import { FrameworkClientOptions } from "strike-discord-framework/dist/interfaces";

import { Application } from "./application.js";

dotenvConfig();

const frameworkOptions: FrameworkClientOptions = {
	commandsPath: `${process.cwd()}/commands/`,
	databaseOpts: {
		databaseName: "caw8-bookkeeper" + (process.env.IS_DEV == "true" ? "-dev" : ""),
		url: process.env.DB_URL
	},
	loggerOpts: {
		filePath: `${process.cwd()}/../logs/`,
		logChannels: {
			INFO: process.env.LOG_CHANNEL,
			ERROR: process.env.ERR_CHANNEL,
			WARN: process.env.ERR_CHANNEL
		},
		logToFile: true
	},
	clientOptions: {
		intents: Object.keys(Intents.FLAGS) as IntentsString[],
		partials: ["CHANNEL", "MESSAGE"]
	},
	defaultPrefix: ".",
	name: "CAW8 Bookkeeper",
	token: process.env.TOKEN,
	ownerID: "272143648114606083",
	dmPrefixOnPing: true,
	dmErrorSilently: false,
	permErrorSilently: false,
};

const frameClient = new FrameworkClient(frameworkOptions);
const application = new Application(frameClient);


async function init() {
	await frameClient.init(application);
	await application.init();
	await frameClient.loadBotCommands(`${process.cwd()}/../node_modules/strike-discord-framework/dist/defaultCommands/`);
	await frameClient.permissions.setPublic("command.misc", true);

	process.on("unhandledRejection", (error) => {
		application.log.error(error);
	});
	process.on("uncaughtException", (error) => {
		application.log.error(error);
	});
}
init();