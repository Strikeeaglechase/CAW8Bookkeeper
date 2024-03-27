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
import { SlashCommand, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { SArg } from "strike-discord-framework/dist/slashCommandArgumentParser.js";
class Link extends SlashCommand {
    name = "link";
    description = "Registers with the bot so that you can attend ops";
    async run({ interaction, app, framework }, name) {
        const alreadyLinked = await app.users.collection.findOne({ discordId: interaction.user.id });
        if (alreadyLinked) {
            await interaction.reply(framework.error(`You are already registered as \`${alreadyLinked.username}\`, if you need to change this contact an admin`));
            return;
        }
        const existingUsername = await app.users.collection.findOne({ username: name });
        if (existingUsername) {
            if (existingUsername.discordId == null) {
                await app.users.collection.updateOne({ id: existingUsername.id }, { $set: { discordId: interaction.user.id } });
                await interaction.reply(framework.success(`Username \`${name}\` has been linked to your account`));
                return;
            }
            await interaction.reply(framework.error(`Username \`${name}\` is already taken, please choose another`));
            return;
        }
        await app.createUser(name, interaction.user.id);
        await interaction.reply(framework.success(`Username \`${name}\` has been linked to your account`));
    }
}
__decorate([
    __param(1, SArg({ minLength: 3, maxLength: 32 })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SlashCommandEvent, String]),
    __metadata("design:returntype", Promise)
], Link.prototype, "run", null);
export default Link;
//# sourceMappingURL=link.js.map