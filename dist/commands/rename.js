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
import { interactionConfirm } from "../iterConfirm.js";
class Rename extends SlashCommand {
    name = "rename";
    description = "Renames a user to correct for typos or other issues";
    static lastNameLookupTime = 0;
    static lastNames = [];
    async run({ interaction, app, framework }, orgName, newName) {
        if (!(await app.isAuthed(interaction)))
            return;
        const orgNameInstances = await app.ops.collection.find({ "members.name": orgName }).toArray();
        if (orgNameInstances.length == 0) {
            await interaction.reply(framework.error(`No entries were found for ${orgName}`));
            return;
        }
        let newNameUser = await app.users.collection.findOne({ username: newName });
        if (!newNameUser) {
            const conf = await interactionConfirm(`User ${newName} does not exist. Would you like to create them?`, interaction);
            if (!conf)
                return;
            newNameUser = await app.createUser(newName);
        }
        const conf = await interactionConfirm(`Are you sure you would like to rename **${orgNameInstances.length}** instances of \`${orgName}\` to \`${newName}\`?`, interaction);
        if (!conf)
            return;
        await app.ops.collection.updateMany({ "members.name": orgName }, { $set: { "members.$[elem].name": newName } }, { arrayFilters: [{ "elem.name": orgName }] });
        await app.users.collection.deleteOne({ username: orgName });
        await interaction.editReply(framework.success(`Renamed **${orgNameInstances.length}** instances of \`${orgName}\` to \`${newName}\``));
    }
    async handleAutocomplete({ interaction, app }) {
        const focusedValue = interaction.options.getFocused(true);
        if (focusedValue.name != "orgname" && focusedValue.name != "newname") {
            await interaction.respond([]);
            return;
        }
        const timeSinceLastLookup = Date.now() - Rename.lastNameLookupTime;
        // 1 minute
        if (timeSinceLastLookup > 1000 * 60) {
            Rename.lastNameLookupTime = Date.now();
            const users = await app.users.get();
            Rename.lastNames = users.map(u => u.username);
        }
        const query = focusedValue.value.toLowerCase();
        const primaryOptions = Rename.lastNames.filter(n => n.toLowerCase().startsWith(query));
        const secondaryOptions = Rename.lastNames.filter(n => n.toLowerCase().includes(query) && !primaryOptions.includes(n));
        const options = [...primaryOptions, ...secondaryOptions].map(n => ({ name: n, value: n })).slice(0, 25);
        await interaction.respond(options);
    }
}
__decorate([
    __param(1, SArg({ minLength: 3, maxLength: 32, autocomplete: true })),
    __param(2, SArg({ minLength: 3, maxLength: 32, autocomplete: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SlashCommandEvent, String, String]),
    __metadata("design:returntype", Promise)
], Rename.prototype, "run", null);
export default Rename;
//# sourceMappingURL=rename.js.map