import { SlashCommand, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { SArg } from "strike-discord-framework/dist/slashCommandArgumentParser.js";

import { Application } from "../application.js";

class Ingest extends SlashCommand {
	name = "ingest";
	description = "Imports an op from the google sheet";

	public override async run({ interaction, app, framework }: SlashCommandEvent<Application>, @SArg() opName: string) {
		if (!(await app.isAuthed(interaction))) return;

		await interaction.deferReply();
		const err = await app.importOp(opName);
		if (err) {
			await interaction.editReply(framework.error(err));
		} else {
			await interaction.editReply(framework.success(`Successfully imported ${opName}`));
		}
	}
}

export default Ingest;
