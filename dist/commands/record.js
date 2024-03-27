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
import { replyOrEdit } from "../application.js";
import { interactionConfirm } from "../iterConfirm.js";
export const aircraft = [
    { name: "AV-42C", value: "AV-42C" },
    { name: "F/A-26B", value: "F/A-26B" },
    { name: "F-45A", value: "F-45A" },
    { name: "AH-94", value: "AH-94" },
    { name: "T-55", value: "T-55" },
    { name: "EF-24G", value: "EF-24G" }
];
export const finishTypes = [
    { name: "Arrested", value: "Arrested" },
    { name: "Vertical", value: "Vertical" },
    { name: "DNF", value: "DNF" },
    { name: "Airfield", value: "Airfield" },
    { name: "Non-pilot", value: "Nonpilot" },
    { name: "N/A", value: "NA" }
];
class Record extends SlashCommand {
    static lastNameLookupTime = 0;
    static lastNames = [];
    name = "record";
    description = "Adds an entry to the op record db";
    async run({ interaction, app, framework }, slot, name, aircraft, completion, combatDeaths, bolters, wire, promotions, remarks) {
        if (!(await app.isAuthed(interaction)))
            return;
        const activeOpId = app.userSelectedOps[interaction.user.id];
        if (!activeOpId) {
            await interaction.reply(app.framework.error("The command `/op edit` must be run before you can edit a record"));
            return;
        }
        const op = await app.ops.get(activeOpId);
        if (!op) {
            await interaction.reply(framework.error("The op you are trying to edit does not exist"));
            return;
        }
        let existingUserEntry = await app.users.collection.findOne({ username: name });
        if (!existingUserEntry) {
            const conf = await interactionConfirm(`User ${name} has no existing entry. Is this their first op?`, interaction);
            if (!conf)
                return;
            existingUserEntry = await app.createUser(name);
        }
        const existingMemberEntry = op.members.find(m => m.name == name);
        if (existingMemberEntry) {
            const conf = await interactionConfirm(`Op ${op.name} ${op.timeslot} already has a record for ${name}, would you like to overwrite it?`, interaction);
            if (!conf)
                return;
            await app.ops.collection.updateOne({ id: op.id }, { $pull: { members: { name: name } } });
        }
        if (completion == "Arrested") {
            if (typeof wire !== "number") {
                await replyOrEdit(interaction, framework.error("Wire is required for Arrested"));
                return;
            }
            if (typeof bolters !== "number") {
                await replyOrEdit(interaction, framework.error("Bolter count is required for Arrested"));
                return;
            }
        }
        const record = {
            slot: slot,
            name: name,
            aircraft: aircraft,
            type: completion,
            combatDeaths: combatDeaths,
            bolters: bolters ?? null,
            wire: wire ?? null,
            promotions: promotions ?? null,
            remarks: remarks ?? null
        };
        await app.ops.collection.updateOne({ id: op.id }, { $push: { members: record } });
        replyOrEdit(interaction, framework.success(`Record for ${name} added to op ${op.name} ${op.timeslot}`));
    }
    async handleAutocomplete({ interaction, app }) {
        const focusedValue = interaction.options.getFocused(true);
        if (focusedValue.name != "name") {
            await interaction.respond([]);
            return;
        }
        const timeSinceLastLookup = Date.now() - Record.lastNameLookupTime;
        // 1 minute
        if (timeSinceLastLookup > 1000 * 60) {
            Record.lastNameLookupTime = Date.now();
            const users = await app.users.get();
            Record.lastNames = users.map(u => u.username);
        }
        const query = focusedValue.value.toLowerCase();
        const primaryOptions = Record.lastNames.filter(n => n.toLowerCase().startsWith(query));
        const secondaryOptions = Record.lastNames.filter(n => n.toLowerCase().includes(query) && !primaryOptions.includes(n));
        const options = [...primaryOptions, ...secondaryOptions].map(n => ({ name: n, value: n })).slice(0, 25);
        await interaction.respond(options);
    }
}
__decorate([
    __param(1, SArg({ minLength: 2, maxLength: 5 })),
    __param(2, SArg({ autocomplete: true, minLength: 3, maxLength: 32 })),
    __param(3, SArg({ choices: aircraft })),
    __param(4, SArg({ choices: finishTypes })),
    __param(5, SArg()),
    __param(6, SArg({ min: 0, max: 99, required: false })),
    __param(7, SArg({ min: 0, max: 4, required: false })),
    __param(8, SArg({ required: false, maxLength: 64 })),
    __param(9, SArg({ required: false, maxLength: 256 })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SlashCommandEvent, String, String, String, String, Number, Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], Record.prototype, "run", null);
export default Record;
//# sourceMappingURL=record.js.map