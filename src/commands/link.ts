import { User } from "discord.js";
import { SlashCommand, SlashCommandAutocompleteEvent, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { SArg } from "strike-discord-framework/dist/slashCommandArgumentParser.js";

import { Application, replyOrEdit } from "../application.js";
import { interactionConfirm } from "../iterConfirm.js";

class Link extends SlashCommand {
	name = "link";
	description = "Registers with the bot so that you can attend ops";

	private static lastNameLookupTime: number = 0;
	private static lastNames: string[] = [];

	public override async run(
		{ interaction, app, framework }: SlashCommandEvent<Application>,
		@SArg({ minLength: 3, maxLength: 32, autocomplete: true }) name: string,
		@SArg({ required: false }) user: User
	) {
		let allowOverwrite = false;
		if (user) {
			if (!(await app.isAuthed(interaction))) return;
			allowOverwrite = true;
		} else {
			user = interaction.user;
		}

		const alreadyLinked = await app.users.collection.findOne({ discordId: user.id });
		if (alreadyLinked) {
			if (!allowOverwrite) {
				await interaction.reply(
					framework.error(`You are already registered as \`${alreadyLinked.username}\`, if you need to change this contact an admin`)
				);
				return;
			}

			const overwrite = await interactionConfirm(
				`The account \`${alreadyLinked.username}\` is currently linked to <@${user.id}>, would you like to change it to \`${name}\`?`,
				interaction
			);
			if (!overwrite) return;

			await app.users.collection.updateOne({ id: alreadyLinked.id }, { $set: { discordId: null } });
		}

		const existingUsername = await app.users.collection.findOne({ username: name });
		if (existingUsername) {
			if (existingUsername.discordId == null || allowOverwrite) {
				await app.users.collection.updateOne({ id: existingUsername.id }, { $set: { discordId: user.id } });
				replyOrEdit(interaction, framework.success(`Username \`${name}\` has been linked to <@${user.id}>`));
				return;
			}

			replyOrEdit(interaction, framework.error(`Username \`${name}\` is already taken, please choose another`));
			return;
		}

		const createNew = await interactionConfirm(
			`Username \`${name}\` does not exist, would you like to create it? (If you've attended an op before you entered your name wrong)`,
			interaction
		);
		if (!createNew) return;

		await app.createUser(name, interaction.user.id);

		replyOrEdit(interaction, framework.success(`Username \`${name}\` has been linked to <@${user.id}>`));
	}

	public override async handleAutocomplete({ interaction, app }: SlashCommandAutocompleteEvent<Application>) {
		const focusedValue = interaction.options.getFocused(true);
		if (focusedValue.name != "name") {
			await interaction.respond([]);
			return;
		}

		const timeSinceLastLookup = Date.now() - Link.lastNameLookupTime;
		// 1 minute
		if (timeSinceLastLookup > 1000 * 60) {
			Link.lastNameLookupTime = Date.now();

			const users = await app.users.get();
			Link.lastNames = users.map(u => u.username);
		}

		const query = focusedValue.value.toLowerCase();
		const primaryOptions = Link.lastNames.filter(n => n.toLowerCase().startsWith(query));
		const secondaryOptions = Link.lastNames.filter(n => n.toLowerCase().includes(query) && !primaryOptions.includes(n));
		const options = [...primaryOptions, ...secondaryOptions].map(n => ({ name: n, value: n })).slice(0, 25);
		await interaction.respond(options);
	}
}

export default Link;
