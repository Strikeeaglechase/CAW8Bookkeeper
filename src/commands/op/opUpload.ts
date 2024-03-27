import { SlashCommand, SlashCommandAutocompleteEvent, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { SArg } from "strike-discord-framework/dist/slashCommandArgumentParser.js";

import { Application } from "../../application.js";
import { opNameAutocomplete } from "./op.js";

class OpUpload extends SlashCommand {
	name = "upload";
	description = "Uploads the op attendance information to the google sheet";

	public override async run({ interaction, app, framework }: SlashCommandEvent<Application>, @SArg({ autocomplete: true }) opName: string) {
		const ops = await app.ops.collection.find({ name: opName }).toArray();
		if (ops.length == 0) {
			await interaction.reply(framework.error(`Op ${opName} not found`));
			return;
		}

		await interaction.reply(`Uploading op ${opName}`);
		const r = await app.uploadOpsToSheet(ops);
		await interaction.editReply(r ?? "Done");
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

export default OpUpload;
