import fs from "fs";
import { CommandRun } from "strike-discord-framework/dist/argumentParser.js";
import { Command, CommandEvent } from "strike-discord-framework/dist/command.js";

import { Application } from "../../application.js";

class Lookup extends Command {
	name = "lookup";
	altNames = [];
	allowDm = true;
	help = {
		msg: "Looks up a specific member's history",
		usage: "<member name>"
	};

	@CommandRun
	async run({ message, framework, app }: CommandEvent<Application>) {
		const query = message.content.split(" ").slice(1).join(" ").trim();
		if (!query) return message.channel.send(framework.error("You must provide a member name!"));
		if (!app.lastSheetsResult) return message.channel.send(framework.error("Run the .run command first!"));

		const { members } = app.lastSheetsResult;
		let memberHistory: string;

		Object.keys(members).forEach(member => {
			if (memberHistory) return;
			if (member.toLowerCase() == query.toLowerCase()) memberHistory = members[member].history;
		});

		Object.keys(members).forEach(member => {
			if (memberHistory) return;
			if (member.toLowerCase().startsWith(query.toLowerCase())) memberHistory = members[member].history;
		});

		Object.keys(members).forEach(member => {
			if (memberHistory) return;
			if (member.toLowerCase().includes(query.toLowerCase())) memberHistory = members[member].history;
		});

		if (!memberHistory) return message.channel.send(framework.error(`Unable to find member by name: "${query}"`));

		const cleanName = query.split(" ").join("_");
		fs.writeFileSync(`../results/${cleanName}.txt`, memberHistory);

		message.channel.send({ files: [`../results/${cleanName}.txt`] });
	}
}

export default Lookup;
