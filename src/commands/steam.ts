import { SlashCommand, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { SArg } from "strike-discord-framework/dist/slashCommandArgumentParser.js";

import { Application } from "../application.js";

class Steam extends SlashCommand {
	name = "steam";
	description = "Links your steam account to your discord account";

	public override async run({ interaction, app, framework }: SlashCommandEvent<Application>, @SArg({}) id: string) {
		const isValidSteamId = id.match(/^\d{16,18}$/);
		if (!isValidSteamId) {
			interaction.reply(framework.error(`Please provide your steamID64 (https://steamid.io/lookup/${id})`));
			return;
		}

		const user = await app.users.collection.findOne({ discordId: interaction.user.id });
		if (!user) {
			interaction.reply(framework.error("You need to link your discord account first"));
			return;
		}

		await app.users.collection.updateOne({ id: user.id }, { $set: { steamId: id } });
		interaction.reply(framework.success(`Steam account linked`));
	}
}

export default Steam;
