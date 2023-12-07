var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import fs from "fs";
import { CommandRun } from "strike-discord-framework/dist/argumentParser.js";
import { Command, CommandEvent } from "strike-discord-framework/dist/command.js";
class Lookup extends Command {
    constructor() {
        super(...arguments);
        this.name = "lookup";
        this.altNames = [];
        this.allowDm = true;
        this.help = {
            msg: "Looks up a specific member's history",
            usage: "<member name>"
        };
    }
    run({ message, framework, app }) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = message.content.split(" ").slice(1).join(" ").trim();
            if (!query)
                return message.channel.send(framework.error("You must provide a member name!"));
            if (!app.lastSheetsResult)
                return message.channel.send(framework.error("Run the .run command first!"));
            const { members } = app.lastSheetsResult;
            let memberHistory;
            Object.keys(members).forEach(member => {
                if (memberHistory)
                    return;
                if (member.toLowerCase() == query.toLowerCase())
                    memberHistory = members[member].history;
            });
            Object.keys(members).forEach(member => {
                if (memberHistory)
                    return;
                if (member.toLowerCase().startsWith(query.toLowerCase()))
                    memberHistory = members[member].history;
            });
            Object.keys(members).forEach(member => {
                if (memberHistory)
                    return;
                if (member.toLowerCase().includes(query.toLowerCase()))
                    memberHistory = members[member].history;
            });
            if (!memberHistory)
                return message.channel.send(framework.error(`Unable to find member by name: "${query}"`));
            const cleanName = query.split(" ").join("_");
            fs.writeFileSync(`../results/${cleanName}.txt`, memberHistory);
            message.channel.send({ files: [`../results/${cleanName}.txt`] });
        });
    }
}
__decorate([
    CommandRun,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CommandEvent]),
    __metadata("design:returntype", Promise)
], Lookup.prototype, "run", null);
export default Lookup;
