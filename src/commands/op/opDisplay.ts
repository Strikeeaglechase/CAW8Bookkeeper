import { SlashCommand, SlashCommandAutocompleteEvent, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { SArg } from "strike-discord-framework/dist/slashCommandArgumentParser.js";

import { Application, timeslots } from "../../application.js";
import { opNameAutocomplete } from "./op.js";

const opTimeSlots = timeslots.map(s => ({ name: s, value: s }));

class OpDisplay extends SlashCommand {
	name = "display";
	description = "Displays an op and its members";

	public override async run(
		{ interaction, app, framework }: SlashCommandEvent<Application>,
		@SArg({ autocomplete: true }) opName: string,
		@SArg({ choices: opTimeSlots, required: false }) timeslot: string
	) {
		if (timeslot) {
			const op = await app.ops.collection.findOne({ name: opName, timeslot });
			if (!op) {
				await interaction.reply(framework.error(`Op ${opName} at ${timeslot} not found`));
				return;
			}

			const emb = await app.createOpDisplayEmbed(op);
			await interaction.reply({ embeds: [emb] });
		} else {
			const ops = await app.ops.collection.find({ name: opName }).toArray();
			if (ops.length == 0) {
				await interaction.reply(framework.error(`Op ${opName} not found`));
				return;
			}

			const embeds = await Promise.all(ops.map(op => app.createOpDisplayEmbed(op)));
			await interaction.reply({ embeds: embeds });
		}
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

export default OpDisplay;
