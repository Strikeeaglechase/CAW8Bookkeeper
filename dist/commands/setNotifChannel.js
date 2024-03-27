var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { SlashCommand, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { NoArgs } from "strike-discord-framework/dist/slashCommandArgumentParser.js";
class SetNotifyChannel extends SlashCommand {
    name = "setnotifchannel";
    description = "Set the channel for username notifications";
    async run({ interaction, app, framework }) {
        if (interaction.user.id != "272143648114606083") {
            await interaction.reply(framework.error("You are not authorized to use this command.", true));
            return;
        }
        const channel = interaction.channel.id;
        const config = await app.getConfig();
        config.nicknameNotifyChannel = channel;
        await app.setConfig(config);
        await interaction.reply(framework.success(`Set notification channel to <#${channel}>`, true));
    }
}
__decorate([
    NoArgs,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SlashCommandEvent]),
    __metadata("design:returntype", Promise)
], SetNotifyChannel.prototype, "run", null);
export default SetNotifyChannel;
//# sourceMappingURL=setNotifChannel.js.map