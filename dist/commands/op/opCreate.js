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
import { replyOrEdit, timeslots } from "../../application.js";
import { interactionConfirm } from "../../iterConfirm.js";
import { opNameAutocomplete } from "./op.js";
const opTimeSlots = timeslots.map(s => ({ name: s, value: s }));
class OpCreate extends SlashCommand {
    name = "create";
    description = "Creates a new op";
    async run({ interaction, app, framework }, opName, timeslot) {
        if (!(await app.isAuthed(interaction)))
            return;
        const existingNamedOp = await app.ops.collection.find({ name: opName }).toArray();
        // If op name already exists, confirm the timeslot doesn't already exist
        if (existingNamedOp.length > 0) {
            const existingTimeslot = existingNamedOp.find(op => op.timeslot === timeslot);
            if (existingTimeslot) {
                await interaction.reply(framework.error(`An op with the name \`${opName}\` already exists at the timeslot ${timeslot}`));
                return;
            }
        }
        else {
            // If op name doesn't exist, confirm the user wants to create it
            const conf = await interactionConfirm(`Op \`${opName}\` does not exist, would you like to create it?`, interaction);
            if (!conf) {
                return;
            }
        }
        const newOp = {
            id: uuidv4(),
            name: opName,
            timeslot: timeslot,
            members: [],
            createdAt: Date.now(),
            endedAt: null
        };
        app.userSelectedOps[interaction.user.id] = newOp.id;
        await app.ops.add(newOp);
        replyOrEdit(interaction, framework.success(`Op ${opName} created at ${timeslot}`));
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
], OpCreate.prototype, "run", null);
export default OpCreate;
//# sourceMappingURL=opCreate.js.map