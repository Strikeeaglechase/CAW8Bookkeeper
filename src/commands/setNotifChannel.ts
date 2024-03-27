import { SlashCommand, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { NoArgs } from "strike-discord-framework/dist/slashCommandArgumentParser.js";

import { Application } from "../application.js";

class SetNotifyChannel extends SlashCommand {
	name = "setnotifchannel";
	description = "Set the channel for username notifications";

	@NoArgs
	public override async run({ interaction, app, framework }: SlashCommandEvent<Application>) {
		if (interaction.user.id != "272143648114606083") {
			await interaction.reply(framework.error("You are not authorized to use this command.", true));
			return;
		}

		const channel = interaction.channel.id;
		const config = await app.getConfig();
		config.nicknameNotifyChannel = channel;
		await app.setConfig(config);
		await interaction.reply(framework.success(`Set notification channel to <#${channel}>`, true));
	}
}

export default SetNotifyChannel;
