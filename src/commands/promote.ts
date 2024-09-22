import { User } from "discord.js";
import { SlashCommand, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { SArg } from "strike-discord-framework/dist/slashCommandArgumentParser.js";

import { Application } from "../application.js";
import { getHighestQualRankFromInfo, ranks } from "../ranks.js";

class Promote extends SlashCommand {
	name = "promote";
	description = "Checks if a user matches promotion criteria and updates their role if they do";

	public override async run({ interaction, app, framework }: SlashCommandEvent<Application>, @SArg() user: User) {
		if (!(await app.isAuthed(interaction))) return;

		const userEntry = await app.users.collection.findOne({ discordId: user.id });
		if (!userEntry) {
			await interaction.reply(framework.error(`User <@${user.id}> is not linked to an account`));
			return;
		}

		const info = await app.calcOpAwards(userEntry.username);
		const guildMember = await interaction.guild.members.fetch(user.id);

		const highestQualifyingRank = getHighestQualRankFromInfo(info);
		const currentRank = ranks.find(r => guildMember.roles.cache.some(role => role.id == r.roleId));
		if (!currentRank) {
			await interaction.reply(framework.error(`User <@${user.id}> does not have a rank role`));
			return;
		}

		if (currentRank == highestQualifyingRank) {
			await interaction.reply(framework.error(`User <@${user.id}> already has highest rank they qualify for: ${currentRank.rank}`));
			return;
		}

		const rankIdx = ranks.findIndex(r => r.rank == currentRank.rank);
		const rank = ranks[rankIdx + 1];
		if (!rank) {
			await interaction.reply(framework.error(`User <@${user.id}> already has highest rank`));
			return;
		}

		const roleToRemove = guildMember.roles.cache.find(role => role.id == currentRank.roleId);
		if (roleToRemove) await guildMember.roles.remove(roleToRemove);
		await guildMember.roles.add(rank.roleId);

		if (currentRank.rank != "Recruit") {
			const oldNamePrefix = currentRank.prefix + ".";
			if (guildMember.displayName.startsWith(oldNamePrefix)) {
				const newName = guildMember.displayName.replace(oldNamePrefix, rank.prefix + ".");
				await guildMember.setNickname(newName);
			}
		} else {
			await guildMember.setNickname(rank.prefix + ". " + guildMember.displayName);
		}

		await interaction.reply(framework.success(`User <@${user.id}> promoted to ${rank.rank}`));
	}
}

export default Promote;
