import { Role } from "discord.js";
import { SlashCommand, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { SArg } from "strike-discord-framework/dist/slashCommandArgumentParser.js";

import { Application } from "../application.js";

class SetAccessRole extends SlashCommand {
	name = "setaccessrole";
	description = "Sets the role that allows users to access/edit ops/users";

	public override async run({ interaction, app, framework }: SlashCommandEvent<Application>, @SArg() role: Role) {
		if (interaction.user.id != "272143648114606083") {
			await interaction.reply(framework.error("You are not authorized to use this command.", true));
			return;
		}

		const config = await app.getConfig();
		config.commandAccessRole = role.id;
		await app.setConfig(config);
		await interaction.reply(framework.success(`Set access role to <@&${role.id}>`, true));
	}
}

export default SetAccessRole;
