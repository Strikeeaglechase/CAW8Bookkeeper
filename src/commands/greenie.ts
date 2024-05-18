import { EmbedBuilder } from "discord.js";
import { SlashCommand, SlashCommandAutocompleteEvent, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { SArg } from "strike-discord-framework/dist/slashCommandArgumentParser.js";

import { Application, OpUser, wireScore, wireScoreEmoji } from "../application.js";

const aircraft = ["AV-42C", "F/A-26B", "F-45A", "AH-94", "T-55", "EF-24G"];
const trollUsers = ["Avacado", "Freedom", "Freedomplaza", "Strikeeaglechase"];

class Greenie extends SlashCommand {
	private static lastNameLookupTime: number = 0;
	private static lastNames: string[] = [];

	name = "greenie";
	description = "Generates a Greenie Board for the user";

	public override async run(
		{ interaction, app, framework }: SlashCommandEvent<Application>,
		@SArg({ autocomplete: true, minLength: 3, maxLength: 32, required: false }) name: string
	) {
		let userEntry: OpUser;
		if (!name) {
			userEntry = await app.users.collection.findOne({ discordId: interaction.user.id });
			if (!userEntry) {
				await interaction.reply(framework.error("You must link your account with `/link` to use this command without a name argument."));
				return;
			}
		} else {
			userEntry = await app.users.collection.findOne({ username: name });
			if (!userEntry) {
				await interaction.reply(framework.error(`No record found for user ${name}`));
				return;
			}
		}

		const info = await app.calcOpAwards(userEntry.username);

		let greenieBoard: Record<string, string[]> = {};
		let totalWireScores: Record<string, number> = {};
		let totalWireCounts: Record<string, number> = {};
		let combinedWireScore = 0;
		let combinedWireCount = 0;
		info.opsAttended.forEach(op => {
			const member = op.members.find(m => m.name == userEntry.username);

			if (member.wire) {
				if (!(member.aircraft in greenieBoard)) {
					greenieBoard[member.aircraft] = [];
					totalWireScores[member.aircraft] = 0;
					totalWireCounts[member.aircraft] = 0;
				}

				greenieBoard[member.aircraft].push(...Array(member.bolters).fill(trollUsers.includes(userEntry.username) ? "💀" : "🟦"));
				// greenieBoard[member.aircraft].push(trollUsers.includes(userEntry.username) ? wireScoreEmojiAvacado(member.wire) : wireScoreEmoji(member.wire));
				greenieBoard[member.aircraft].push(wireScoreEmoji(member.wire));
				totalWireScores[member.aircraft] += wireScore(member.wire);
				totalWireCounts[member.aircraft]++;
				totalWireCounts[member.aircraft] += member.bolters;

				combinedWireScore += wireScore(member.wire);
				combinedWireCount++;
				combinedWireCount += member.bolters;
			}
		});

		let greenieBoardString = ``;
		let averagesString = `\`${"Total".padEnd(7, " ")} ${(combinedWireScore / combinedWireCount).toFixed(2)}\`\n`;
		let overflowFlag = false;

		for (let aircraftName of aircraft) {
			if (aircraftName in greenieBoard) {
				//Creates Greenie Table
				greenieBoardString += `\`${aircraftName.padEnd(7, " ")}\`${greenieBoard[aircraftName].slice(-24).join("")}\n`;
				overflowFlag = greenieBoard[aircraftName].length >= 24 || overflowFlag;

				//Calculates Averages per aircraft
				let aircraftWireAverage = totalWireScores[aircraftName] / totalWireCounts[aircraftName];
				averagesString += `\`${aircraftName.padEnd(7, " ")} ${aircraftWireAverage.toFixed(2)}\`\n`;
			}
		}

		greenieBoardString += overflowFlag ? "(Only showing latest 24 landings per aircraft)" : "";

		const embed = new EmbedBuilder();
		embed.setTitle(`Greenie Board for ${userEntry.username}`);
		embed.setDescription(greenieBoardString);
		embed.setFooter({ text: "Brought to you by C-137" });
		embed.addFields([
			{ name: "Wire GPA (4 is highest)", value: averagesString, inline: true },
			{ name: "Wire Guide", value: "4:🟧 3:🟩 2:🟨 1:🟥 Bolter:🟦", inline: true }
		]);

		//interaction.reply({ embeds: [embed], files: [attachment] });

		//Greenie Board test
		interaction.reply({ embeds: [embed] });
	}

	public override async handleAutocomplete({ interaction, app }: SlashCommandAutocompleteEvent<Application>) {
		const focusedValue = interaction.options.getFocused(true);
		if (focusedValue.name != "name") {
			await interaction.respond([]);
			return;
		}

		const timeSinceLastLookup = Date.now() - Greenie.lastNameLookupTime;
		// 1 minute
		if (timeSinceLastLookup > 1000 * 60) {
			Greenie.lastNameLookupTime = Date.now();

			const users = await app.users.get();
			Greenie.lastNames = users.map(u => u.username);
		}

		const query = focusedValue.value.toLowerCase();
		const primaryOptions = Greenie.lastNames.filter(n => n.toLowerCase().startsWith(query));
		const secondaryOptions = Greenie.lastNames.filter(n => n.toLowerCase().includes(query) && !primaryOptions.includes(n));
		const options = [...primaryOptions, ...secondaryOptions].map(n => ({ name: n, value: n })).slice(0, 25);
		await interaction.respond(options);
	}
}

export default Greenie;
