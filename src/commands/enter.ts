import { SlashCommand, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { SArg } from "strike-discord-framework/dist/slashCommandArgumentParser.js";

import { Application, formatAndValidateSlot } from "../application.js";

class Enter extends SlashCommand {
	name = "enter";
	description = "Fills out bolter/wire/death information for a user that attended an op";

	public override async run(
		{ interaction, app, framework }: SlashCommandEvent<Application>,
		@SArg({ minLength: 2, maxLength: 5 }) slot: string,
		@SArg({ min: 0 }) combatDeaths: number,
		@SArg({ min: 0, max: 99, required: false }) bolters: number,
		@SArg({ min: 0, max: 4, required: false }) wire: number,
		@SArg({ required: false, maxLength: 64 }) promotions: string,
		@SArg({ required: false, maxLength: 256 }) remarks: string
	) {
		if (!(await app.isAuthed(interaction))) return;
		if (app.activeOp == null) {
			await interaction.reply(framework.error("No active op set, have the person running the op run `/op enable`"));
			return;
		}

		const op = await app.ops.collection.findOne({ id: app.activeOp });
		if (!op) {
			await interaction.reply(framework.error("Active op is set to an op that does not exist, have the person running the op run `/op enable`"));
			return;
		}
		const validSlot = formatAndValidateSlot(slot);
		if (!validSlot) {
			await interaction.reply(framework.error(`Invalid slot format "\`${slot}\`", must be in the format "A1-2" (also valid: A12, A2)`));
			return;
		}
		const member = op.members.find(m => m.slot == validSlot);
		if (!member) {
			await interaction.reply(framework.error(`No member found for slot \`${validSlot}\`, ensure they have run \`/attend\``));
			return;
		}
		member.combatDeaths = combatDeaths;
		if (bolters != null) member.bolters = bolters;
		if (wire != null) member.wire = wire;
		if (promotions != null) member.promotions = promotions;
		if (remarks != null) member.remarks = remarks;

		if (member.type == "Arrested" && member.wire == null) {
			await interaction.reply(framework.error("An arrested pilot must have a listed value for `wire`"));
			return;
		}

		await app.ops.collection.updateOne({ id: op.id }, { $set: { members: op.members } });
		await interaction.reply(framework.success(`Updated \`${member.name}\``));
	}
}

export default Enter;
