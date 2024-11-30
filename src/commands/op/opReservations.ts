import { TextChannel } from "discord.js";
import { SlashCommand, SlashCommandAutocompleteEvent, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { SArg } from "strike-discord-framework/dist/slashCommandArgumentParser.js";

import { Application } from "../../application.js";
import { opNameAutocomplete } from "./op.js";

class OpReservations extends SlashCommand {
	name = "reservations";
	description = "Creates the persistent reservation message for the op";

	public override async run({ interaction, app, framework }: SlashCommandEvent<Application>, @SArg({ autocomplete: true }) opName: string) {
		if (!(await app.isAuthed(interaction))) return;

		const reservationsObject = await app.getReservations(opName);
		if (reservationsObject.channelId != null && reservationsObject.messageId != null) {
			const channel = await interaction.guild.channels.fetch(reservationsObject.channelId).catch(e => null);
			if (channel != null) {
				const message = await (channel as TextChannel).messages.fetch(reservationsObject.messageId).catch(e => null);
				if (message) await message.delete();
			}
		}

		const message = await interaction.channel.send({ content: "Loading reservations..." });
		await app.reservations.collection.updateOne({ opName }, { $set: { channelId: message.channel.id, messageId: message.id } });
		app.updateReservationsMessage(opName);
		await interaction.reply(framework.success(`Reservations message created for op ${opName}`, true));
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

export default OpReservations;
