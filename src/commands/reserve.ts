import { SlashCommand, SlashCommandAutocompleteEvent, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { SArg } from "strike-discord-framework/dist/slashCommandArgumentParser.js";

import { Application, formatAndValidateSlot, replyOrEdit, timeslots } from "../application.js";
import { interactionConfirm } from "../iterConfirm.js";
import { opNameAutocomplete } from "./op/op.js";

const opTimeSlots = timeslots.map(s => ({ name: s, value: s }));
class Reserve extends SlashCommand {
	name = "reserve";
	description = "Reserve's a FL slot in an upcoming op";

	public override async run(
		{ interaction, app, framework }: SlashCommandEvent<Application>,
		@SArg({ autocomplete: true }) opName: string,
		@SArg({ choices: opTimeSlots }) timeslot: string,
		@SArg() slot: string
	) {
		if (!(await app.isFlightLead(interaction))) return;

		const validSlot = formatAndValidateSlot(slot);
		if (!validSlot) {
			await interaction.reply(framework.error(`Invalid slot format "\`${slot}\`", must be in the format "A1-2" (also valid: A12, A2)`, true));
			return;
		}

		const op = await app.ops.collection.findOne({ name: opName, timeslot: timeslot });
		if (!op) {
			await interaction.reply(framework.error(`No op found with the name \`${opName}\` and timeslot \`${timeslot}\``, true));
			return;
		}

		const res = await app.getReservations(opName);
		let hasReplied = false;

		const slotDesignation = validSlot[0];
		if (!res.reservations[timeslot]) res.reservations[timeslot] = {};
		const existingRes = res.reservations[timeslot][slotDesignation];
		if (existingRes) {
			const result = await interactionConfirm(`Slot ${slotDesignation} is already reserved by ${existingRes}, do you want to replace them?`, interaction);
			if (!result) return;

			hasReplied = true;
		}

		res.reservations[timeslot][slotDesignation] = interaction.user.username;
		await app.reservations.collection.updateOne({ opName }, { $set: { reservations: res.reservations } });
		app.updateReservationsMessage(opName);
		replyOrEdit(interaction, framework.success(`Slot ${slotDesignation} reserved for ${interaction.user.username}`, hasReplied));
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

export default Reserve;
