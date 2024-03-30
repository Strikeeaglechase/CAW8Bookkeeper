import { SlashCommand } from "strike-discord-framework/dist/slashCommand.js";
import { NoArgs } from "strike-discord-framework/dist/slashCommandArgumentParser.js";

class OpEnd extends SlashCommand {
	name = "end";
	description = "Ends the active op";

	@NoArgs
	public override async run({ interaction, app, framework }) {
		if (!(await app.isAuthed(interaction))) return;
		if (app.activeOp == null) {
			await interaction.reply(framework.error("No active op set"));
			return;
		}

		app.activeOp = null;
		await interaction.reply(framework.success("Active op has been ended"));
	}
}

export default OpEnd;
