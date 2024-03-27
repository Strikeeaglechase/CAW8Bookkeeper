import { SlashCommand, SlashCommandAutocompleteEvent, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { SArg } from "strike-discord-framework/dist/slashCommandArgumentParser.js";

import { Application, timeslots } from "../../application.js";
import { opNameAutocomplete } from "./op.js";

const opTimeSlots = timeslots.map(s => ({ name: s, value: s }));

class OpSet extends SlashCommand {
	name = "edit";
	description = "Sets the op you will be editing";

	public override async run(
		{ interaction, app, framework }: SlashCommandEvent<Application>,
		@SArg({ autocomplete: true }) opName: string,
		@SArg({ choices: opTimeSlots }) timeslot: string
	) {
		if (!(await app.isAuthed(interaction))) return;
		const op = await app.ops.collection.findOne({ name: opName, timeslot: timeslot });
		if (!op) {
			await interaction.reply(framework.error(`Op ${opName} does not exist at ${timeslot}, create it with \`/op create\``));
			return;
		}

		app.userSelectedOps[interaction.user.id] = op.id;

		await interaction.reply(framework.success(`Editing op ${opName} at ${timeslot}`));
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

export default OpSet;
