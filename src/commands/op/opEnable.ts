import { SlashCommand, SlashCommandAutocompleteEvent, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { SArg } from "strike-discord-framework/dist/slashCommandArgumentParser.js";

import { Application, timeslots } from "../../application.js";
import { opNameAutocomplete } from "./op.js";

const opTimeSlots = timeslots.map(s => ({ name: s, value: s }));

class OpEnable extends SlashCommand {
	name = "enable";
	description = "Sets an op as active so that members can mark themselves as attending";

	public override async run(
		{ interaction, app, framework }: SlashCommandEvent<Application>,
		@SArg({ autocomplete: true }) opName: string,
		@SArg({ choices: opTimeSlots }) timeslot: string
	) {
		if (!(await app.isAuthed(interaction))) return;
		const op = await app.ops.collection.findOne({ name: opName, timeslot });
		if (!op) {
			await interaction.reply(framework.error(`Op ${opName} at ${timeslot} not found`));
			return;
		}

		app.activeOp = op.id;
		app.userSelectedOps[interaction.user.id] = op.id;
		await interaction.reply(framework.success(`Op ${opName} at ${timeslot} is now active`));
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

export default OpEnable;
