import { SlashCommand, SlashCommandAutocompleteEvent, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { SArg } from "strike-discord-framework/dist/slashCommandArgumentParser.js";
import confirm from "strike-discord-framework/dist/util/reactConfirm.js";

import { Application, CompletionType, DBOpMember, formatAndValidateSlot, OpUser, replyOrEdit } from "../application.js";
import { interactionConfirm } from "../iterConfirm.js";

export const aircraft = [
	{ name: "AV-42C", value: "AV-42C" },
	{ name: "F/A-26B", value: "F/A-26B" },
	{ name: "F-45A", value: "F-45A" },
	{ name: "AH-94", value: "AH-94" },
	{ name: "T-55", value: "T-55" },
	{ name: "EF-24G", value: "EF-24G" }
];

export const finishTypes: { name: string; value: CompletionType }[] = [
	{ name: "Arrested", value: "Arrested" },
	{ name: "Vertical", value: "Vertical" },
	{ name: "DNF", value: "DNF" },
	{ name: "Airfield", value: "Airfield" },
	{ name: "Non-pilot", value: "Nonpilot" },
	{ name: "N/A", value: "NA" }
];

class Record extends SlashCommand {
	private static lastNameLookupTime: number = 0;
	private static lastNames: string[] = [];

	name = "record";
	description = "Adds an entry to the op record db";

	public override async run(
		{ interaction, app, framework }: SlashCommandEvent<Application>,
		@SArg({ minLength: 2, maxLength: 5 }) slot: string,
		@SArg({ autocomplete: true, minLength: 3, maxLength: 32 }) name: string,
		@SArg({ choices: aircraft }) aircraft: string,
		@SArg({ choices: finishTypes }) completion: string,
		@SArg() combatDeaths: number,
		@SArg({ min: 0, max: 99, required: false }) bolters: number,
		@SArg({ min: 0, max: 4, required: false }) wire: number,
		@SArg({ required: false, maxLength: 64 }) promotions: string,
		@SArg({ required: false, maxLength: 256 }) remarks: string
	) {
		if (!(await app.isAuthed(interaction))) return;
		const activeOpId = app.userSelectedOps[interaction.user.id];
		if (!activeOpId) {
			await interaction.reply(app.framework.error("The command `/op edit` must be run before you can edit a record"));
			return;
		}

		const op = await app.ops.get(activeOpId);
		if (!op) {
			await interaction.reply(framework.error("The op you are trying to edit does not exist"));
			return;
		}

		let existingUserEntry: OpUser = await app.users.collection.findOne({ username: name });
		if (!existingUserEntry) {
			const conf = await interactionConfirm(`User ${name} has no existing entry. Is this their first op?`, interaction);
			if (!conf) return;
			existingUserEntry = await app.createUser(name);
		}

		const existingMemberEntry = op.members.find(m => m.name == name);
		if (existingMemberEntry) {
			const conf = await interactionConfirm(`Op ${op.name} ${op.timeslot} already has a record for ${name}, would you like to overwrite it?`, interaction);
			if (!conf) return;

			await app.ops.collection.updateOne({ id: op.id }, { $pull: { members: { name: name } } });
		}

		if (completion == "Arrested") {
			if (typeof wire !== "number") {
				await replyOrEdit(interaction, framework.error("Wire is required for Arrested"));
				return;
			}

			if (typeof bolters !== "number") {
				await replyOrEdit(interaction, framework.error("Bolter count is required for Arrested"));
				return;
			}
		}

		const validSlot = formatAndValidateSlot(slot);
		if (!validSlot) {
			await interaction.reply(framework.error(`Invalid slot format "\`${slot}\`", must be in the format "A1-2" (also valid: A12, A2)`, true));
			return;
		}

		const record: DBOpMember = {
			slot: validSlot,
			name: name,
			aircraft: aircraft,
			type: completion as CompletionType,
			combatDeaths: combatDeaths,
			bolters: bolters ?? null,
			wire: wire ?? null,
			promotions: promotions ?? null,
			remarks: remarks ?? null
		};

		await app.ops.collection.updateOne({ id: op.id }, { $push: { members: record } });
		replyOrEdit(interaction, framework.success(`Record for ${name} added to op ${op.name} ${op.timeslot}`));
	}

	public override async handleAutocomplete({ interaction, app }: SlashCommandAutocompleteEvent<Application>) {
		const focusedValue = interaction.options.getFocused(true);
		if (focusedValue.name != "name") {
			await interaction.respond([]);
			return;
		}

		const timeSinceLastLookup = Date.now() - Record.lastNameLookupTime;
		// 1 minute
		if (timeSinceLastLookup > 1000 * 60) {
			Record.lastNameLookupTime = Date.now();

			const users = await app.users.get();
			Record.lastNames = users.map(u => u.username);
		}

		const query = focusedValue.value.toLowerCase();
		const primaryOptions = Record.lastNames.filter(n => n.toLowerCase().startsWith(query));
		const secondaryOptions = Record.lastNames.filter(n => n.toLowerCase().includes(query) && !primaryOptions.includes(n));
		const options = [...primaryOptions, ...secondaryOptions].map(n => ({ name: n, value: n })).slice(0, 25);
		await interaction.respond(options);
	}
}

export default Record;
