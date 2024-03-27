import { SlashCommand, SlashCommandAutocompleteEvent, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { SArg } from "strike-discord-framework/dist/slashCommandArgumentParser.js";
import confirm from "strike-discord-framework/dist/util/reactConfirm.js";

import { Application, formatAndValidateSlot } from "../../application.js";
import { interactionConfirm } from "../../iterConfirm.js";
import { opMemberNameAutocompleteHandler, requireConfirmation, resolveOpOrError } from "./edit.js";

class EditSlot extends SlashCommand {
	name = "slot";
	description = "Edits the slot a user is in";

	public override async run(
		{ interaction, app, framework }: SlashCommandEvent<Application>,
		@SArg({ autocomplete: true, minLength: 3, maxLength: 32 }) name: string,
		@SArg({ minLength: 3, maxLength: 5 }) slot: string
	) {
		if (!(await app.isAuthed(interaction))) return;
		const op = await resolveOpOrError(interaction, app);
		if (!op) return;

		const existingUserEntry = op.members.find(m => m.name == name);
		if (!existingUserEntry) {
			await interaction.reply(framework.error(`User ${name} does not exist in op ${op.name} ${op.timeslot}`));
			return;
		}

		const orgSlot = slot;
		slot = formatAndValidateSlot(slot);
		if (!slot) {
			await interaction.reply(framework.error(`Invalid slot format "\`${orgSlot}\`", must be in the format "A1-2" (also valid: A12, A2)`));
			return;
		}

		await interaction.deferReply();
		if (requireConfirmation) {
			const conf = await interactionConfirm(`Are you sure you want to move ${name} from slot "${existingUserEntry.slot}" to slot "${slot}"?`, interaction);

			if (!conf) {
				return;
			}
		}

		await app.ops.collection.updateOne({ id: op.id }, { $set: { "members.$[elem].slot": slot } }, { arrayFilters: [{ "elem.name": name }] });

		await interaction.editReply(framework.success(`${name} moved from slot "${existingUserEntry.slot}" to slot "${slot}"`));
	}

	public override async handleAutocomplete(event: SlashCommandAutocompleteEvent<Application>) {
		const focusedValue = event.interaction.options.getFocused(true);
		if (focusedValue.name != "name") {
			await event.interaction.respond([]);
			return;
		}

		opMemberNameAutocompleteHandler(event, event.app.userSelectedOps[event.interaction.user.id]);
	}
}

export default EditSlot;
