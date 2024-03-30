import { SlashCommand, SlashCommandAutocompleteEvent, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { SArg } from "strike-discord-framework/dist/slashCommandArgumentParser.js";
import confirm from "strike-discord-framework/dist/util/reactConfirm.js";
import { v4 as uuidv4 } from "uuid";

import { Application, DBOp, replyOrEdit, timeslots } from "../../application.js";
import { interactionConfirm } from "../../iterConfirm.js";
import { opNameAutocomplete } from "./op.js";

const opTimeSlots = timeslots.map(s => ({ name: s, value: s }));

class OpCreate extends SlashCommand {
	name = "create";
	description = "Creates a new op";

	public override async run(
		{ interaction, app, framework }: SlashCommandEvent<Application>,
		@SArg({ autocomplete: true }) opName: string,
		@SArg({ choices: opTimeSlots }) timeslot: string
	) {
		if (!(await app.isAuthed(interaction))) return;
		const existingNamedOp = await app.ops.collection.find({ name: opName }).toArray();
		// If op name already exists, confirm the timeslot doesn't already exist
		if (existingNamedOp.length > 0) {
			const existingTimeslot = existingNamedOp.find(op => op.timeslot === timeslot);
			if (existingTimeslot) {
				await interaction.reply(framework.error(`An op with the name \`${opName}\` already exists at the timeslot ${timeslot}`));
				return;
			}
		} else {
			// If op name doesn't exist, confirm the user wants to create it
			const conf = await interactionConfirm(`Op \`${opName}\` does not exist, would you like to create it?`, interaction);
			if (!conf) {
				return;
			}
		}

		const newOp: DBOp = {
			id: uuidv4(),
			name: opName,
			timeslot: timeslot,
			members: [],

			createdAt: Date.now(),
			endedAt: null
		};
		app.userSelectedOps[interaction.user.id] = newOp.id;

		await app.ops.add(newOp);

		replyOrEdit(interaction, framework.success(`Op ${opName} created at ${timeslot}`));
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

export default OpCreate;
