import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	CommandInteraction,
	ComponentType,
	EmbedBuilder,
	MessagePayload,
	InteractionEditReplyOptions
} from "discord.js";

export function interactionConfirm(prompt: string, iter: CommandInteraction, ephemeral = false) {
	const emb = new EmbedBuilder();

	emb.setTitle("Confirmation");
	emb.setDescription(prompt);
	emb.setColor("#0096ff");
	emb.setFooter({ text: "You have 5 minutes to respond, after which this confirmation will automatically be denied." });

	let row = new ActionRowBuilder<ButtonBuilder>();
	const confirmId = "confirm" + iter.id;
	const cancelId = "cancel" + iter.id;
	const confirm = new ButtonBuilder({ label: "Confirm", customId: confirmId, style: ButtonStyle.Success });
	const cancel = new ButtonBuilder({ label: "Cancel", customId: cancelId, style: ButtonStyle.Danger });
	row.addComponents(confirm, cancel);

	if (iter.deferred || iter.replied) {
		iter.editReply({ embeds: [emb], components: [row] });
	} else {
		iter.reply({ embeds: [emb], components: [row], ephemeral: ephemeral });
	}

	return new Promise<boolean>(res => {
		const collector = iter.channel.createMessageComponentCollector({
			componentType: ComponentType.Button,
			filter: i => i.user.id == iter.user.id
		});

		async function disable(accepted: boolean) {
			collector.stop();
			confirm.setDisabled(true);
			cancel.setDisabled(true);
			row = new ActionRowBuilder();
			row.addComponents(confirm, cancel);
			if (accepted) {
				emb.setColor("#00ff00");
				emb.setFooter({ text: "Action confirmed" });
			} else {
				emb.setColor("#ff0000");
				emb.setFooter({ text: "Action canceled" });
			}
			await iter.editReply({ embeds: [emb], components: [row] });
		}

		const timeout = setTimeout(async () => {
			await disable(false);
			res(false);
		}, 1000 * 60 * 5);

		collector.on("collect", async i => {
			if (i.customId == confirmId) {
				i.reply({ content: "```diff\n+ Confirmed\n```", ephemeral: true });
				await disable(true);
				res(true);
				collector.stop();
			} else if (i.customId == cancelId) {
				i.reply({ content: "```diff\n- Canceled\n```", ephemeral: true });
				await disable(false);
				res(false);
				collector.stop();
			}
		});

		collector.on("end", reason => {
			clearTimeout(timeout);
		});
	});
}

export function replyOrEdit(iter: CommandInteraction, content: string | MessagePayload | InteractionEditReplyOptions) {
	if (iter.replied || iter.deferred) {
		return iter.editReply(content);
	} else {
		return iter.reply(content);
	}
}
