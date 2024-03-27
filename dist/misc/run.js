var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { CommandRun } from "strike-discord-framework/dist/argumentParser.js";
import { Command, CommandEvent } from "strike-discord-framework/dist/command.js";
class Run extends Command {
    name = "run";
    altNames = [];
    allowDm = true;
    help = {
        msg: "Reads the OP google sheet then parses awards and history",
        usage: ""
    };
    async run({ message, framework, app }) {
        const workingMessage = await message.channel.send(framework.success("Working..."));
        const resultPath = await app.runSheetUpdate();
        if (!resultPath)
            return workingMessage.edit(framework.error("Failed to parse sheets!"));
        message.channel.send({ files: [resultPath] });
        workingMessage.delete();
    }
}
__decorate([
    CommandRun,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CommandEvent]),
    __metadata("design:returntype", Promise)
], Run.prototype, "run", null);
export default Run;
//# sourceMappingURL=run.js.map