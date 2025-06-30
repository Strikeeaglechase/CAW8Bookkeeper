import { SlashCommand, SlashCommandAutocompleteEvent, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { SArg } from "strike-discord-framework/dist/slashCommandArgumentParser.js";
import { v4 as uuidv4 } from "uuid";

import { EmbedBuilder } from "@discordjs/builders";

import { Application, timeslots } from "../../application.js";
import { interactionConfirm } from "../../iterConfirm.js";
import { opNameAutocomplete } from "./op.js";

const opTimeSlots = timeslots.map(s => ({ name: s, value: s }));

class Recover extends SlashCommand {
	name = "recover";
	description = "Configures attendance recovery for an op that missed attendance for whatever reason";
	allowDm: boolean = true;

	public override async run(
		{ interaction, app, framework }: SlashCommandEvent<Application>,
		@SArg({ autocomplete: true }) opName: string,
		@SArg({ choices: opTimeSlots }) timeslot: string,
		@SArg() users: string
	) {
		if (!(await app.isAuthed(interaction))) return;
		const op = await app.ops.collection.findOne({ name: opName, timeslot });
		if (!op) {
			await interaction.reply(framework.error(`Op ${opName} at ${timeslot} not found`));
			return;
		}

		const targetedUsers = users.split(",").map(u => u.trim());
		const conf = await interactionConfirm(
			`Mark the following users for attendance recovery in ${op.name} at ${op.timeslot}:\n\`${targetedUsers.join("`, `")}\``,
			interaction
		);
		if (!conf) return;

		let errors = ``;
		const recoveryProms = targetedUsers.map(async user => {
			const dUser = await interaction.client.users.fetch(user).catch(() => {});
			if (!dUser) {
				errors += `Unable to resolve ${user}\n`;
				return null;
			}

			const existingRecovery = await app.attendanceRecoveries.collection.findOne({ userDiscordId: dUser.id, opId: op.id });
			if (existingRecovery) {
				errors += `${dUser.username} (${dUser.id}) is already marked for attendance recovery on this op\n`;
				return null;
			}

			const emb = new EmbedBuilder();
			emb.setDescription(
				`You have been marked for attendance recovery in ${op.name} at ${op.timeslot}\nPlease run \`/attend\` in the server to record your attendance`
			);
			emb.setFooter({ text: `If you are marked for multiple ops attendance is in order that you received the DMs` });
			const dmMessage = await dUser.send({ embeds: [emb] }).catch(() => {});
			if (!dmMessage) errors += `Unable to send DM to ${dUser.username} (${dUser.id})\n`;

			return {
				recovery: {
					opId: op.id,
					userDiscordId: user,
					id: uuidv4(),
					createdAt: Date.now()
				},
				user: {
					id: dUser.id,
					username: dUser.username
				}
			};
		});

		const recoveries = (await Promise.all(recoveryProms)).filter(r => r != null);
		if (recoveries.length > 0) {
			await app.attendanceRecoveries.collection.insertMany(recoveries.map(r => r.recovery));
		}

		const successUsers = recoveries.map(r => r.user.username).join(", ");
		let resultMessage = `Marked the following users for attendance recovery in ${op.name} at ${op.timeslot}:\n\`${successUsers}\``;
		if (errors.length > 0) {
			resultMessage += `\n\n**Errors:**\n\`\`\`\n${errors}\`\`\``;
		}

		await interaction.editReply(framework.success(resultMessage));
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

export default Recover;
