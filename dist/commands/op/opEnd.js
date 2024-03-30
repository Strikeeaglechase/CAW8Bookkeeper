var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { SlashCommand } from "strike-discord-framework/dist/slashCommand.js";
import { NoArgs } from "strike-discord-framework/dist/slashCommandArgumentParser.js";
class OpEnd extends SlashCommand {
    name = "end";
    description = "Ends the active op";
    async run({ interaction, app, framework }) {
        if (!(await app.isAuthed(interaction)))
            return;
        if (app.activeOp == null) {
            await interaction.reply(framework.error("No active op set"));
            return;
        }
        app.activeOp = null;
        await interaction.reply(framework.success("Active op has been ended"));
    }
}
__decorate([
    NoArgs,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OpEnd.prototype, "run", null);
export default OpEnd;
//# sourceMappingURL=opEnd.js.map