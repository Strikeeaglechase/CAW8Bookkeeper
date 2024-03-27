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
import { timeslots } from "../../application.js";
import { opNameAutocomplete } from "./op.js";
const opTimeSlots = timeslots.map(s => ({ name: s, value: s }));
class OpEnable extends SlashCommand {
    name = "enable";
    description = "Sets an op as active so that members can mark themselves as attending";
    async run({ interaction, app, framework }, opName, timeslot) {
        if (!(await app.isAuthed(interaction)))
            return;
        const op = await app.ops.collection.findOne({ name: opName, timeslot });
        if (!op) {
            await interaction.reply(framework.error(`Op ${opName} at ${timeslot} not found`));
            return;
        }
        app.activeOp = op.id;
        app.userSelectedOps[interaction.user.id] = op.id;
        await interaction.reply(framework.success(`Op ${opName} at ${timeslot} is now active`));
    }
    async handleAutocomplete({ interaction, app }) {
        const focusedValue = interaction.options.getFocused(true);
        if (focusedValue.name != "opname") {
            await interaction.respond([]);
            return;
        }
        const options = await opNameAutocomplete(app, focusedValue.value);
        await interaction.respond(options);
    }
}
__decorate([
    __param(1, SArg({ autocomplete: true })),
    __param(2, SArg({ choices: opTimeSlots })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SlashCommandEvent, String, String]),
    __metadata("design:returntype", Promise)
], OpEnable.prototype, "run", null);
export default OpEnable;
//# sourceMappingURL=opEnable.js.map