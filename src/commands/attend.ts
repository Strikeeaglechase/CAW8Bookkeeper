import { EmbedBuilder } from "discord.js";
import { SlashCommand, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { SArg } from "strike-discord-framework/dist/slashCommandArgumentParser.js";

import { Application, CompletionType, DBOpMember, formatAndValidateSlot } from "../application.js";
import { finishTypes } from "./record.js";

class Attend extends SlashCommand {
	name = "attend";
	description = "Marks yourself as having attended the active op";

	public override async run(
		{ interaction, app, framework }: SlashCommandEvent<Application>,
		@SArg() slot: string,
		@SArg({ choices: finishTypes }) landing: string,
		@SArg({ min: 0 }) combatDeaths: number,
		@SArg({ required: false }) bolters: number,
		@SArg({ min: 0, max: 4, required: false }) wire: number
	) {
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
			await interaction.reply(framework.error(`Invalid slot format "\`${slot}\`", must be in the format "A1-2" (also valid: A12, A2)`, true));
			return;
		}

		const opUser = await app.getUserByDiscordId(interaction.user.id);
		if (!opUser) {
			interaction.reply(framework.error(`You have not linked your account, please run \`/link pilot_name\` to link your account`, true));
			return;
		}

		const slotDesignation = validSlot[0];
		const opSlot = await app.slots.collection.findOne({ opName: op.name, slot: slotDesignation });
		if (!opSlot) {
			await interaction.reply(
				framework.error(`Slot \`${validSlot}\` does not exist in the op (if this is a mistake, have the person running the op run \`/op slot\`)`)
			);
			return;
		}

		if (landing == "Arrested" && (!wire || bolters == undefined)) {
			await interaction.reply(framework.error("You must provide the number of bolters and wires for a carrier landing", true));
			return;
		}

		const existingEntry = op.members.find(m => m.name == opUser.username);
		const remarkText = existingEntry?.remarks ?? "";
		let aceRemark = bolters == 0 && wire == 3 && combatDeaths == 0 && !remarkText.includes("ACE!") ? " ACE!" : "";
		if (existingEntry) {
			let remarks = (existingEntry.remarks ?? "") + aceRemark;
			await app.ops.collection.updateOne(
				{ id: op.id },
				{
					$set: {
						"members.$[elem].type": landing,
						"members.$[elem].slot": validSlot,
						"members.$[elem].bolters": bolters ?? null,
						"members.$[elem].wire": wire ?? null,
						"members.$[elem].combatDeaths": combatDeaths ?? null,
						"members.$[elem].remarks": remarks,
						"members.$[elem].aircraft": opSlot.aircraft
					}
				},
				{ arrayFilters: [{ "elem.name": opUser.username }] }
			);
			// await interaction.reply(
			// 	framework.success(`You have been marked as attending the op in slot \`${validSlot}\` as a \`${opSlot.aircraft}\` for ${op.name} ${op.timeslot}`)
			// );
		} else {
			const newOpMember: DBOpMember = {
				aircraft: opSlot.aircraft,
				name: opUser.username,
				type: landing as CompletionType,
				slot: validSlot,
				bolters: bolters ?? null,
				wire: wire ?? null,
				combatDeaths: combatDeaths ?? null,
				promotions: null,
				remarks: aceRemark
			};

			await app.ops.collection.updateOne({ id: op.id }, { $push: { members: newOpMember } });
		}

		const successEmbed = new EmbedBuilder({ color: 0x00ff00 });
		// await interaction.reply(framework.success(`Marked as attending the op in slot \`${validSlot}\` as a ${opSlot.aircraft} for ${op.name} ${op.timeslot}`));
		successEmbed.setTitle(opUser.username);
		if (landing == "Arrested") {
			successEmbed.setDescription(
				`Attended in \`${validSlot}\` as a \`${opSlot.aircraft}\`, Deaths: **${combatDeaths}**, Bolters: **${bolters}**, Wire: **${wire}**`
			);
		} else {
			successEmbed.setDescription(`Attended in \`${validSlot}\` as a \`${opSlot.aircraft}\`, Deaths: **${combatDeaths}**. Finished as \`${landing}\``);
		}

		successEmbed.setFooter({ text: `${op.name} ${op.timeslot}` });
		await interaction.reply({ embeds: [successEmbed] });
	}
}

export default Attend;
