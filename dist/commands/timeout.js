var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { User } from "discord.js";
import { SlashCommand, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { SArg } from "strike-discord-framework/dist/slashCommandArgumentParser.js";
const timeoutChoices = [
    { name: "15 seconds", value: 15 * 1000 },
    { name: "1 minute", value: 60 * 1000 },
    { name: "30 minutes", value: 30 * 60 * 1000 },
    { name: "1 hour", value: 60 * 60 * 1000 },
    { name: "1 day", value: 24 * 60 * 60 * 1000 },
    { name: "1 week", value: 7 * 24 * 60 * 60 * 1000 }
];
class Timeout extends SlashCommand {
    name = "timeout";
    description = "Timeout a user";
    async run({ interaction, app, framework }, target, time, reason) {
        const guildMember = await interaction.guild.members.fetch(target.id).catch(() => { });
        if (!guildMember) {
            await interaction.reply(framework.error("You are not in the server you ran this command in (how?"));
            return;
        }
        const hasTimeoutPerms = guildMember.permissions.has("ModerateMembers");
        if (!hasTimeoutPerms) {
            await interaction.reply(framework.error("You do not have permission to timeout this user"));
            return;
        }
        const targetMember = await interaction.guild.members.fetch(target.id).catch(() => { });
        if (!targetMember) {
            await interaction.reply(framework.error("Could not find the target member"));
            return;
        }
        await targetMember.timeout(time);
        await targetMember.send(`You have been timed out from CAW8 for: ${reason}`).catch(() => { });
        await interaction.reply(framework.success(`Successfully timed out ${target.tag} for ${time}ms`, true));
    }
}
__decorate([
    __param(1, SArg()),
    __param(2, SArg({ choices: timeoutChoices })),
    __param(3, SArg({ description: "DMed to the member" })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SlashCommandEvent,
        User, Number, String]),
    __metadata("design:returntype", Promise)
], Timeout.prototype, "run", null);
export default Timeout;
//# sourceMappingURL=timeout.js.map