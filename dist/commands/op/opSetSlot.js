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
import { v4 as uuidv4 } from "uuid";
import { replyOrEdit } from "../../application.js";
import { interactionConfirm } from "../../iterConfirm.js";
import { aircraft } from "../record.js";
import { opNameAutocomplete } from "./op.js";
const slotChoices = "ABCDEFGHIJKLMNOPQRSTUVWYZ".split("").map(s => ({ name: s, value: s }));
class OpSetSlot extends SlashCommand {
    name = "slot";
    description = "Edits the aircraft assigned to each slot";
    async run({ interaction, app, framework }, opName, slot, aircraft, name) {
        if (!(await app.isAuthed(interaction)))
            return;
        const existingEntry = await app.slots.collection.findOne({ opName: opName, slot: slot });
        if (existingEntry) {
            const result = await interactionConfirm(`Op ${opName} already has slot ${existingEntry.slot} (${existingEntry.slotName}) assigned as ${existingEntry.aircraft}, do you want to overwrite it?`, interaction);
            if (!result)
                return;
            await app.slots.collection.deleteOne({ id: existingEntry.id });
        }
        if (name[0] != slot) {
            replyOrEdit(interaction, framework.error(`Slot name ${name} does not match slot ${slot}`));
            return;
        }
        const slotEntry = {
            opName: opName,
            slot: slot,
            slotName: name,
            aircraft: aircraft,
            id: uuidv4()
        };
        await app.slots.add(slotEntry);
        replyOrEdit(interaction, framework.success(`Assigned slot ${slot} (${name}) to ${aircraft} for ${opName}`));
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
    __param(2, SArg({ choices: slotChoices })),
    __param(3, SArg({ choices: aircraft })),
    __param(4, SArg({ maxLength: 32 })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SlashCommandEvent, String, String, String, String]),
    __metadata("design:returntype", Promise)
], OpSetSlot.prototype, "run", null);
export default OpSetSlot;
//# sourceMappingURL=opSetSlot.js.map