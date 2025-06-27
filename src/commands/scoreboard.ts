import { PermissionFlagsBits } from "discord.js";
import { SlashCommand, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { NoArgs } from "strike-discord-framework/dist/slashCommandArgumentParser.js";

import { Application } from "../application.js";
import { interactionConfirm, replyOrEdit } from "../iterConfirm.js";

class Scoreboard extends SlashCommand {
	name = "scoreboard";
	description = "Creates the scoreboard listing, max 1 per server, must be an admin to run this command";
	allowDm = false;
	defaultPermission = PermissionFlagsBits.Administrator;

	@NoArgs
	async run({ interaction, framework, app }: SlashCommandEvent<Application>) {
		const m = await interaction.guild.members.fetch(interaction.user.id);
		if (!m || !m.permissions.has(PermissionFlagsBits.BanMembers)) {
			return framework.error(`You must be "admin" to run this command`);
		}

		const existing = await app.scoreboardMessages.collection.findOne({ guildId: interaction.guild.id });

		if (existing) {
			const confirm = await interactionConfirm(`There is already a scoreboard in this server, do you want to delete it?`, interaction);
			if (confirm) {
				await app.deleteScoreboard(existing);
			}
		}

		const scoreboard = await app.createScoreboard(interaction);
		if (!scoreboard) {
			replyOrEdit(interaction, framework.error(`An error has occurred while creating the scoreboard`, true));
			return;
		}
		replyOrEdit(interaction, framework.success(`Scoreboard created!`, true));
	}
}

export default Scoreboard;
