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
import { interactionConfirm } from "../../iterConfirm.js";
import { opMemberNameAutocompleteHandler, requireConfirmation, resolveOpOrError } from "./edit.js";
class EditBolters extends SlashCommand {
    name = "bolters";
    description = "Updates a users bolters";
    async run({ interaction, app, framework }, name, bolters) {
        if (!(await app.isAuthed(interaction)))
            return;
        const op = await resolveOpOrError(interaction, app);
        if (!op)
            return;
        const existingUserEntry = op.members.find(m => m.name == name);
        if (!existingUserEntry) {
            await interaction.reply(framework.error(`User ${name} does not exist in op ${op.name} ${op.timeslot}`));
            return;
        }
        await interaction.deferReply();
        if (requireConfirmation) {
            const conf = await interactionConfirm(`Are you sure you want to update ${name}'s bolters from "${existingUserEntry.bolters}" to "${bolters}"?`, interaction);
            if (!conf) {
                return;
            }
        }
        await app.ops.collection.updateOne({ id: op.id }, { $set: { "members.$[elem].bolters": bolters } }, { arrayFilters: [{ "elem.name": name }] });
        await interaction.editReply(framework.success(`${name} changed from "${existingUserEntry.bolters}" to "${bolters}"`));
    }
    async handleAutocomplete(event) {
        const focusedValue = event.interaction.options.getFocused(true);
        if (focusedValue.name != "name") {
            await event.interaction.respond([]);
            return;
        }
        opMemberNameAutocompleteHandler(event, event.app.userSelectedOps[event.interaction.user.id]);
    }
}
__decorate([
    __param(1, SArg({ autocomplete: true, minLength: 3, maxLength: 32 })),
    __param(2, SArg({ min: 0, max: 99 })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SlashCommandEvent, String, Number]),
    __metadata("design:returntype", Promise)
], EditBolters.prototype, "run", null);
export default EditBolters;
//# sourceMappingURL=editBolters.js.map