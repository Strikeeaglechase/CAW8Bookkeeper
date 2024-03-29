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
class Ingest extends SlashCommand {
    name = "ingest";
    description = "Imports an op from the google sheet";
    async run({ interaction, app, framework }, opName) {
        if (!(await app.isAuthed(interaction)))
            return;
        await interaction.deferReply();
        const err = await app.importOp(opName);
        if (err) {
            await interaction.editReply(framework.error(err));
        }
        else {
            await interaction.editReply(framework.success(`Successfully imported ${opName}`));
        }
    }
}
__decorate([
    __param(1, SArg()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SlashCommandEvent, String]),
    __metadata("design:returntype", Promise)
], Ingest.prototype, "run", null);
export default Ingest;
//# sourceMappingURL=ingest.js.map