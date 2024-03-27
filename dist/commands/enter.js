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
import { formatAndValidateSlot } from "../application.js";
class Enter extends SlashCommand {
    name = "enter";
    description = "Fills out bolter/wire/death information for a user that attended an op";
    async run({ interaction, app, framework }, slot, combatDeaths, bolters, wire, promotions, remarks) {
        if (!(await app.isAuthed(interaction)))
            return;
        if (app.activeOp == null) {
            await interaction.reply(framework.error("No active op set, have the person running the op run `/op enable`"));
            return;
        }
        const op = await app.ops.collection.findOne({ id: app.activeOp });
        if (!op) {
            await interaction.reply(framework.error("Active op is set to an op that does not exist, have the person running the op run `/op enable`"));
            return;
        }
        const validSlot = formatAndValidateSlot(slot);
        if (!validSlot) {
            await interaction.reply(framework.error(`Invalid slot format "\`${slot}\`", must be in the format "A1-2" (also valid: A12, A2)`));
            return;
        }
        const member = op.members.find(m => m.slot == validSlot);
        if (!member) {
            await interaction.reply(framework.error(`No member found for slot \`${validSlot}\`, ensure they have run \`/attend\``));
            return;
        }
        member.combatDeaths = combatDeaths;
        if (bolters != null)
            member.bolters = bolters;
        if (wire != null)
            member.wire = wire;
        if (promotions != null)
            member.promotions = promotions;
        if (remarks != null)
            member.remarks = remarks;
        if (member.type == "Arrested" && member.wire == null) {
            await interaction.reply(framework.error("An arrested pilot must have a listed value for `wire`"));
            return;
        }
        await app.ops.collection.updateOne({ id: op.id }, { $set: { members: op.members } });
        await interaction.reply(framework.success(`Updated \`${member.name}\``));
    }
}
__decorate([
    __param(1, SArg({ minLength: 2, maxLength: 5 })),
    __param(2, SArg({ min: 0 })),
    __param(3, SArg({ min: 0, max: 99, required: false })),
    __param(4, SArg({ min: 0, max: 4, required: false })),
    __param(5, SArg({ required: false, maxLength: 64 })),
    __param(6, SArg({ required: false, maxLength: 256 })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SlashCommandEvent, String, Number, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], Enter.prototype, "run", null);
export default Enter;
//# sourceMappingURL=enter.js.map