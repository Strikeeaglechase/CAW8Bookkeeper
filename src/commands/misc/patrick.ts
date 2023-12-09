import fs from "fs";
import { CommandRun } from "strike-discord-framework/dist/argumentParser.js";
import { Command, CommandEvent } from "strike-discord-framework/dist/command.js";

import { Application } from "../../application.js";

class Patrick extends Command {
	name = "patrick";
	altNames = [];
	allowDm = false;

	@CommandRun
	async run({ message, framework, app }: CommandEvent<Application>) {
		fs.writeFileSync("../patrick.txt", `0\n0`);
		return framework.success("Patrick has been reset!");
	}
}

export default Patrick;
