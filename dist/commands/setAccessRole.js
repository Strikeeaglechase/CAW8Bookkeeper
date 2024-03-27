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
import { Role } from "discord.js";
import { SlashCommand, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { SArg } from "strike-discord-framework/dist/slashCommandArgumentParser.js";
class SetAccessRole extends SlashCommand {
    name = "setaccessrole";
    description = "Sets the role that allows users to access/edit ops/users";
    async run({ interaction, app, framework }, role) {
        if (interaction.user.id != "272143648114606083") {
            await interaction.reply(framework.error("You are not authorized to use this command.", true));
            return;
        }
        const config = await app.getConfig();
        config.commandAccessRole = role.id;
        await app.setConfig(config);
        await interaction.reply(framework.success(`Set access role to <@&${role.id}>`, true));
    }
}
__decorate([
    __param(1, SArg()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SlashCommandEvent, Role]),
    __metadata("design:returntype", Promise)
], SetAccessRole.prototype, "run", null);
export default SetAccessRole;
//# sourceMappingURL=setAccessRole.js.map