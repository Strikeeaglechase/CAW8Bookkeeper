import { User } from "discord.js";
import { SlashCommand, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { SArg } from "strike-discord-framework/dist/slashCommandArgumentParser.js";

import { Application } from "../application.js";

const timeoutChoices = [
	{ name: "15 seconds", value: 15 * 1000 },
	{ name: "1 minute", value: 60 * 1000 },
	{ name: "30 minutes", value: 30 * 60 * 1000 },
	{ name: "1 hour", value: 60 * 60 * 1000 },
	{ name: "1 day", value: 24 * 60 * 60 * 1000 },
	{ name: "1 week", value: 7 * 24 * 60 * 60 * 1000 },
	{ name: "1 month", value: 30 * 24 * 60 * 60 * 1000 },
	{ name: "1 year", value: 365 * 24 * 60 * 60 * 1000 },
	{ name: "100 years", value: 100 * 365 * 24 * 60 * 60 * 1000 }
];

class Timeout extends SlashCommand {
	name = "timeout";
	description = "Timeout a user";

	public override async run(
		{ interaction, app, framework }: SlashCommandEvent<Application>,
		@SArg() target: User,
		@SArg({ choices: timeoutChoices }) time: number,
		@SArg({ description: "DMed to the member" }) reason: string
	) {
		const guildMember = await interaction.guild.members.fetch(target.id).catch(() => {});
		if (!guildMember) {
			await interaction.reply(framework.error("You are not in the server you ran this command in (how?"));
			return;
		}

		const hasTimeoutPerms = guildMember.permissions.has("ModerateMembers");
		if (!hasTimeoutPerms) {
			await interaction.reply(framework.error("You do not have permission to timeout this user"));
			return;
		}

		const targetMember = await interaction.guild.members.fetch(target.id).catch(() => {});
		if (!targetMember) {
			await interaction.reply(framework.error("Could not find the target member"));
			return;
		}

		await targetMember.timeout(time);
		await targetMember.send(`You have been timed out from CAW8 for: ${reason}`).catch(() => {});
		await interaction.reply(framework.success(`Successfully timed out ${target.tag} for ${time}ms`, true));
	}
}

export default Timeout;
