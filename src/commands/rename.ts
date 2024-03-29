import { SlashCommand, SlashCommandAutocompleteEvent, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { SArg } from "strike-discord-framework/dist/slashCommandArgumentParser.js";

import { Application, OpUser } from "../application.js";
import { interactionConfirm } from "../iterConfirm.js";

class Rename extends SlashCommand {
	name = "rename";
	description = "Renames a user to correct for typos or other issues";

	private static lastNameLookupTime: number = 0;
	private static lastNames: string[] = [];

	public override async run(
		{ interaction, app, framework }: SlashCommandEvent<Application>,
		@SArg({ minLength: 3, maxLength: 32, autocomplete: true }) orgName: string,
		@SArg({ minLength: 3, maxLength: 32, autocomplete: true }) newName: string
	) {
		if (!(await app.isAuthed(interaction))) return;
		const orgNameInstances = await app.ops.collection.find({ "members.name": orgName }).toArray();
		if (orgNameInstances.length == 0) {
			await interaction.reply(framework.error(`No entries were found for ${orgName}`));
			return;
		}

		let newNameUser: OpUser = await app.users.collection.findOne({ username: newName });
		if (!newNameUser) {
			const conf = await interactionConfirm(`User ${newName} does not exist. Would you like to create them?`, interaction);
			if (!conf) return;

			newNameUser = await app.createUser(newName);
		}

		const conf = await interactionConfirm(
			`Are you sure you would like to rename **${orgNameInstances.length}** instances of \`${orgName}\` to \`${newName}\`?`,
			interaction
		);
		if (!conf) return;

		await app.ops.collection.updateMany(
			{ "members.name": orgName },
			{ $set: { "members.$[elem].name": newName } },
			{ arrayFilters: [{ "elem.name": orgName }] }
		);
		await app.users.collection.deleteOne({ username: orgName });

		await interaction.editReply(framework.success(`Renamed **${orgNameInstances.length}** instances of \`${orgName}\` to \`${newName}\``));
	}

	public override async handleAutocomplete({ interaction, app }: SlashCommandAutocompleteEvent<Application>) {
		const focusedValue = interaction.options.getFocused(true);
		if (focusedValue.name != "orgname" && focusedValue.name != "newname") {
			await interaction.respond([]);
			return;
		}

		const timeSinceLastLookup = Date.now() - Rename.lastNameLookupTime;
		// 1 minute
		if (timeSinceLastLookup > 1000 * 60) {
			Rename.lastNameLookupTime = Date.now();

			const users = await app.users.get();
			Rename.lastNames = users.map(u => u.username);
		}

		const query = focusedValue.value.toLowerCase();
		const primaryOptions = Rename.lastNames.filter(n => n.toLowerCase().startsWith(query));
		const secondaryOptions = Rename.lastNames.filter(n => n.toLowerCase().includes(query) && !primaryOptions.includes(n));
		const options = [...primaryOptions, ...secondaryOptions].map(n => ({ name: n, value: n })).slice(0, 25);
		await interaction.respond(options);
	}
}

export default Rename;
