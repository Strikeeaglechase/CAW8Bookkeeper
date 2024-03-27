import { SlashCommand, SlashCommandAutocompleteEvent, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { SArg } from "strike-discord-framework/dist/slashCommandArgumentParser.js";
import confirm from "strike-discord-framework/dist/util/reactConfirm.js";

import { Application } from "../../application.js";
import { interactionConfirm } from "../../iterConfirm.js";
import { finishTypes } from "../record.js";
import { opMemberNameAutocompleteHandler, requireConfirmation, resolveOpOrError } from "./edit.js";

class EditCompletion extends SlashCommand {
	name = "completion";
	description = "Edits the aircraft a user flew";

	public override async run(
		{ interaction, app, framework }: SlashCommandEvent<Application>,
		@SArg({ autocomplete: true, minLength: 3, maxLength: 32 }) name: string,
		@SArg({ choices: finishTypes }) completion: string
	) {
		if (!(await app.isAuthed(interaction))) return;
		const op = await resolveOpOrError(interaction, app);
		if (!op) return;

		const existingUserEntry = op.members.find(m => m.name == name);
		if (!existingUserEntry) {
			await interaction.reply(framework.error(`User ${name} does not exist in op ${op.name} ${op.timeslot}`));
			return;
		}

		await interaction.deferReply();
		if (requireConfirmation) {
			const conf = await interactionConfirm(
				`Are you sure you want to update ${name}'s finish from "${existingUserEntry.type}" to "${completion}"?`,
				interaction
			);

			if (!conf) {
				return;
			}
		}

		await app.ops.collection.updateOne({ id: op.id }, { $set: { "members.$[elem].type": completion } }, { arrayFilters: [{ "elem.name": name }] });

		await interaction.editReply(framework.success(`${name} changed from "${existingUserEntry.type}" to "${completion}"`));
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

export default EditCompletion;
