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
import { opNameAutocomplete } from "./op.js";
class OpUpload extends SlashCommand {
    name = "upload";
    description = "Uploads the op attendance information to the google sheet";
    async run({ interaction, app, framework }, opName) {
        const ops = await app.ops.collection.find({ name: opName }).toArray();
        if (ops.length == 0) {
            await interaction.reply(framework.error(`Op ${opName} not found`));
            return;
        }
        await interaction.reply(`Uploading op ${opName}`);
        const r = await app.uploadOpsToSheet(ops);
        await interaction.editReply(r ?? "Done");
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SlashCommandEvent, String]),
    __metadata("design:returntype", Promise)
], OpUpload.prototype, "run", null);
export default OpUpload;
//# sourceMappingURL=opUpload.js.map