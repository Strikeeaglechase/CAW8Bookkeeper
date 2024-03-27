import { SlashCommand, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { SArg } from "strike-discord-framework/dist/slashCommandArgumentParser.js";

import { Application } from "../application.js";

class Link extends SlashCommand {
	name = "link";
	description = "Registers with the bot so that you can attend ops";

	public override async run({ interaction, app, framework }: SlashCommandEvent<Application>, @SArg({ minLength: 3, maxLength: 32 }) name: string) {
		const alreadyLinked = await app.users.collection.findOne({ discordId: interaction.user.id });
		if (alreadyLinked) {
			await interaction.reply(framework.error(`You are already registered as \`${alreadyLinked.username}\`, if you need to change this contact an admin`));
			return;
		}

		const existingUsername = await app.users.collection.findOne({ username: name });
		if (existingUsername) {
			if (existingUsername.discordId == null) {
				await app.users.collection.updateOne({ id: existingUsername.id }, { $set: { discordId: interaction.user.id } });
				await interaction.reply(framework.success(`Username \`${name}\` has been linked to your account`));
				return;
			}

			await interaction.reply(framework.error(`Username \`${name}\` is already taken, please choose another`));
			return;
		}

		await app.createUser(name, interaction.user.id);

		await interaction.reply(framework.success(`Username \`${name}\` has been linked to your account`));
	}
}

export default Link;
