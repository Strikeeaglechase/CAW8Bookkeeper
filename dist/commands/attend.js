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
import { EmbedBuilder } from "discord.js";
import { SlashCommand, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { SArg } from "strike-discord-framework/dist/slashCommandArgumentParser.js";
import { formatAndValidateSlot } from "../application.js";
import { finishTypes } from "./record.js";
class Attend extends SlashCommand {
    name = "attend";
    description = "Marks yourself as having attended the active op";
    async run({ interaction, app, framework }, slot, landing, combatDeaths, bolters, wire) {
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
            await interaction.reply(framework.error(`Invalid slot format "\`${slot}\`", must be in the format "A1-2" (also valid: A12, A2)`, true));
            return;
        }
        const opUser = await app.getUserByDiscordId(interaction.user.id);
        if (!opUser) {
            interaction.reply(framework.error(`You have not linked your account, please run \`/link pilot_name\` to link your account`, true));
            return;
        }
        const slotDesignation = validSlot[0];
        const opSlot = await app.slots.collection.findOne({ opName: op.name, slot: slotDesignation });
        if (!opSlot) {
            await interaction.reply(framework.error(`Slot \`${validSlot}\` does not exist in the op (if this is a mistake, have the person running the op run \`/op slot\`)`));
            return;
        }
        if (landing == "Arrested" && (!wire || bolters == undefined)) {
            await interaction.reply(framework.error("You must provide the number of bolters and wires for a carrier landing", true));
            return;
        }
        const existingEntry = op.members.find(m => m.name == opUser.username);
        const remarkText = existingEntry?.remarks ?? "";
        let aceRemark = bolters == 0 && wire == 3 && combatDeaths == 0 && !remarkText.includes("ACE!") ? " ACE!" : "";
        if (existingEntry) {
            let remarks = (existingEntry.remarks ?? "") + aceRemark;
            await app.ops.collection.updateOne({ id: op.id }, {
                $set: {
                    "members.$[elem].type": landing,
                    "members.$[elem].slot": validSlot,
                    "members.$[elem].bolters": bolters ?? null,
                    "members.$[elem].wire": wire ?? null,
                    "members.$[elem].combatDeaths": combatDeaths ?? null,
                    "members.$[elem].remarks": remarks
                }
            }, { arrayFilters: [{ "elem.name": opUser.username }] });
            // await interaction.reply(
            // 	framework.success(`You have been marked as attending the op in slot \`${validSlot}\` as a \`${opSlot.aircraft}\` for ${op.name} ${op.timeslot}`)
            // );
        }
        else {
            const newOpMember = {
                aircraft: opSlot.aircraft,
                name: opUser.username,
                type: landing,
                slot: validSlot,
                bolters: bolters ?? null,
                wire: wire ?? null,
                combatDeaths: combatDeaths ?? null,
                promotions: null,
                remarks: aceRemark
            };
            await app.ops.collection.updateOne({ id: op.id }, { $push: { members: newOpMember } });
        }
        const successEmbed = new EmbedBuilder({ color: 0x00ff00 });
        // await interaction.reply(framework.success(`Marked as attending the op in slot \`${validSlot}\` as a ${opSlot.aircraft} for ${op.name} ${op.timeslot}`));
        successEmbed.setTitle(opUser.username);
        if (landing == "Arrested") {
            successEmbed.setDescription(`Attended in \`${validSlot}\` as a \`${opSlot.aircraft}\`, Deaths: **${combatDeaths}**, Bolters: **${bolters}**, Wires: **${wire}**`);
        }
        else {
            successEmbed.setDescription(`Attended in \`${validSlot}\` as a \`${opSlot.aircraft}\`, Deaths: **${combatDeaths}**. Finished as \`${landing}\``);
        }
        successEmbed.setFooter({ text: `${op.name} ${op.timeslot}` });
        await interaction.reply({ embeds: [successEmbed] });
    }
}
__decorate([
    __param(1, SArg()),
    __param(2, SArg({ choices: finishTypes })),
    __param(3, SArg({ min: 0 })),
    __param(4, SArg({ required: false })),
    __param(5, SArg({ min: 0, max: 4, required: false })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SlashCommandEvent, String, String, Number, Number, Number]),
    __metadata("design:returntype", Promise)
], Attend.prototype, "run", null);
export default Attend;
//# sourceMappingURL=attend.js.map