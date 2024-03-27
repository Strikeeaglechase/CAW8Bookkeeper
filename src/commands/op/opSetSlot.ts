import { SlashCommand, SlashCommandAutocompleteEvent, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { SArg } from "strike-discord-framework/dist/slashCommandArgumentParser.js";
import { v4 as uuidv4 } from "uuid";

import { Application, OpSlotConfig, replyOrEdit } from "../../application.js";
import { interactionConfirm } from "../../iterConfirm.js";
import { aircraft } from "../record.js";
import { opNameAutocomplete } from "./op.js";

const slotChoices = "ABCDEFGHIJKLMNOPQRSTUVWYZ".split("").map(s => ({ name: s, value: s }));

class OpSetSlot extends SlashCommand {
	name = "slot";
	description = "Edits the aircraft assigned to each slot";

	public override async run(
		{ interaction, app, framework }: SlashCommandEvent<Application>,
		@SArg({ autocomplete: true }) opName: string,
		@SArg({ choices: slotChoices }) slot: string,
		@SArg({ choices: aircraft }) aircraft: string,
		@SArg({ maxLength: 32 }) name: string
	) {
		if (!(await app.isAuthed(interaction))) return;
		const existingEntry = await app.slots.collection.findOne({ opName: opName, slot: slot });
		if (existingEntry) {
			const result = await interactionConfirm(
				`Op ${opName} already has slot ${existingEntry.slot} (${existingEntry.slotName}) assigned as ${existingEntry.aircraft}, do you want to overwrite it?`,
				interaction
			);

			if (!result) return;

			await app.slots.collection.deleteOne({ id: existingEntry.id });
		}

		if (name[0] != slot) {
			replyOrEdit(interaction, framework.error(`Slot name ${name} does not match slot ${slot}`));
			return;
		}

		const slotEntry: OpSlotConfig = {
			opName: opName,
			slot: slot,
			slotName: name,
			aircraft: aircraft,
			id: uuidv4()
		};

		await app.slots.add(slotEntry);

		replyOrEdit(interaction, framework.success(`Assigned slot ${slot} (${name}) to ${aircraft} for ${opName}`));
	}

	public override async handleAutocomplete({ interaction, app }: SlashCommandAutocompleteEvent<Application>) {
		const focusedValue = interaction.options.getFocused(true);
		if (focusedValue.name != "opname") {
			await interaction.respond([]);
			return;
		}

		const options = await opNameAutocomplete(app, focusedValue.value);
		await interaction.respond(options);
	}
}

export default OpSetSlot;
