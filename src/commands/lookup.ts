import { AttachmentBuilder, EmbedBuilder } from "discord.js";
import { SlashCommand, SlashCommandAutocompleteEvent, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { SArg } from "strike-discord-framework/dist/slashCommandArgumentParser.js";

import { Application, OpUser, wireScore } from "../application.js";
import { getHighestQualRank } from "../ranks.js";

class Lookup extends SlashCommand {
	private static lastNameLookupTime: number = 0;
	private static lastNames: string[] = [];

	name = "lookup";
	description = "Looks up a user's record";

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
		let fiveOpsWithoutDeathCount = 0;
		let fiveOpsWithoutBolterCount = 0;
		info.awards.forEach(a => {
			if (a.type == "fiveOpsWithoutBolter") fiveOpsWithoutBolterCount++;
			if (a.type == "fiveOpsWithoutDeath") fiveOpsWithoutDeathCount++;
		});

		let opLog = "";
		let tOps = 0;
		let uOps = 0;
		const uOpNames: Set<string> = new Set();
		let totalWireScore = 0;
		let totalWireCounts = 0;

		info.opsAttended.forEach(op => {
			const member = op.members.find(m => m.name == userEntry.username);
			let deathLog = "";
			if (member.combatDeaths > 0) {
				deathLog = `Died ${member.combatDeaths} times`;
			} else if (member.combatDeaths == 0) {
				deathLog = "Did not die";
			} else {
				deathLog = "No logged death";
			}

			let bolterLog = "";
			if (member.type != "Arrested") {
				bolterLog = `No trap (${member.type})`;
			} else {
				if (member.bolters > 0) {
					bolterLog = `Boltered ${member.bolters} times`;
				} else {
					bolterLog = "Did not bolter";
				}
			}

			const achievementsThisOp = info.awards.filter(a => a.afterOpId == op.id);
			let achievementLogText: string[] = [];
			achievementsThisOp.forEach(a => {
				if (a.type == "fiveOpsWithoutBolter") achievementLogText.push("Safety 'S' Award");
				if (a.type == "fiveOpsWithoutDeath") achievementLogText.push("Golden Wrench Award");
			});
			const achievementLog = achievementLogText.length > 0 ? `Achievements: ${achievementLogText.join(", ")}` : "";

			opLog += `${op.name}, ${op.timeslot}: ${deathLog}, ${bolterLog}, Wire: ${member.wire ?? "N/A"}, Remarks: ${
				member.remarks ?? "N/A"
			} ${achievementLog}\n`;

			if (!uOpNames.has(op.name)) {
				uOps++;
				uOpNames.add(op.name);
			}
			tOps++;

			if (member.wire) {
				totalWireScore += wireScore(member.wire);
				totalWireCounts++;
				totalWireCounts += member.bolters;
			}
		});

		const highestQualifyRank = getHighestQualRank(uOps, tOps);

		const embed = new EmbedBuilder();
		embed.setTitle(`Op Record for ${userEntry.username}`);
		embed.addFields([
			{
				name: `Ops attended`,
				value: info.opsAttended.length.toString(),
				inline: true
			},
			{
				name: `Unique ops attended`,
				value: uOps.toString(),
				inline: true
			},
			{
				name: `Ops without death`,
				value: `Current streak: \`${info.fullOpsWithoutDeath}\`\nTotal: \`${info.overallTotalOpsWithoutDeath}\``,
				inline: true
			},
			{
				name: `Ops without bolter`,
				value: `Current streak: \`${info.fullOpsWithoutBolter}\`\nTotal: \`${info.overallTotalOpsWithoutBolter}\``,
				inline: true
			},
			{
				name: "Safety 'S' Awards",
				value: fiveOpsWithoutBolterCount.toString(),
				inline: true
			},
			{
				name: "Golden Wrench Awards",
				value: fiveOpsWithoutDeathCount.toString(),
				inline: true
			},
			{
				name: "Highest Qualified Rank",
				value: highestQualifyRank.rank,
				inline: true
			},
			{
				name: "Wire GPA",
				value: (totalWireScore / totalWireCounts).toFixed(2),
				inline: true
			}
		]);

		// const attachment = new (await app.elo.getUserLog(user.id, targetSeason, achievementLogText), "history.txt");
		// const files = [attachment];
		const attachment = new AttachmentBuilder(Buffer.from(opLog), { name: "history.txt" });

		interaction.reply({ embeds: [embed], files: [attachment] });
	}

	public override async handleAutocomplete({ interaction, app }: SlashCommandAutocompleteEvent<Application>) {
		const focusedValue = interaction.options.getFocused(true);
		if (focusedValue.name != "name") {
			await interaction.respond([]);
			return;
		}

		const timeSinceLastLookup = Date.now() - Lookup.lastNameLookupTime;
		// 1 minute
		if (timeSinceLastLookup > 1000 * 60) {
			Lookup.lastNameLookupTime = Date.now();

			const users = await app.users.get();
			Lookup.lastNames = users.map(u => u.username);
		}

		const query = focusedValue.value.toLowerCase();
		const primaryOptions = Lookup.lastNames.filter(n => n.toLowerCase().startsWith(query));
		const secondaryOptions = Lookup.lastNames.filter(n => n.toLowerCase().includes(query) && !primaryOptions.includes(n));
		const options = [...primaryOptions, ...secondaryOptions].map(n => ({ name: n, value: n })).slice(0, 25);
		await interaction.respond(options);
	}
}

export default Lookup;
