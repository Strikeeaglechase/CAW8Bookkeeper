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
import { AttachmentBuilder, EmbedBuilder } from "discord.js";
import { SlashCommand, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { SArg } from "strike-discord-framework/dist/slashCommandArgumentParser.js";
import { wireScore } from "../application.js";
const qualifyRanks = [
    { rank: "Recruit", uOps: 0, tOps: 0 },
    { rank: "Lieutenant Junior Grade", uOps: 2, tOps: 3 },
    { rank: "Lieutenant", uOps: 3, tOps: 6 },
    { rank: "Lieutenant Commander", uOps: 5, tOps: 8 },
    { rank: "Commander", uOps: 8, tOps: 12 }
];
class Lookup extends SlashCommand {
    static lastNameLookupTime = 0;
    static lastNames = [];
    name = "lookup";
    description = "Looks up a user's record";
    async run({ interaction, app, framework }, name) {
        let userEntry;
        if (!name) {
            userEntry = await app.users.collection.findOne({ discordId: interaction.user.id });
            if (!userEntry) {
                await interaction.reply(framework.error("You must link your account with `/link` to use this command without a name argument."));
                return;
            }
        }
        else {
            userEntry = await app.users.collection.findOne({ username: name });
            if (!userEntry) {
                await interaction.reply(framework.error(`No record found for user ${name}`));
                return;
            }
        }
        const info = await app.calcOpAwards(userEntry.username);
        let fiveOpsWithoutDeathCount = 0;
        let fiveOpsWithoutBolterCount = 0;
        info.awards.forEach(a => {
            if (a.type == "fiveOpsWithoutBolter")
                fiveOpsWithoutBolterCount++;
            if (a.type == "fiveOpsWithoutDeath")
                fiveOpsWithoutDeathCount++;
        });
        let opLog = "";
        let tOps = 0;
        let uOps = 0;
        const uOpNames = new Set();
        let totalWireScore = 0;
        let totalWireCounts = 0;
        info.opsAttended.forEach(op => {
            const member = op.members.find(m => m.name == userEntry.username);
            let deathLog = "";
            if (member.combatDeaths > 0) {
                deathLog = `Died ${member.combatDeaths} times`;
            }
            else if (member.combatDeaths == 0) {
                deathLog = "Did not die";
            }
            else {
                deathLog = "No logged death";
            }
            let bolterLog = "";
            if (member.type != "Arrested") {
                bolterLog = `No trap (${member.type})`;
            }
            else {
                if (member.bolters > 0) {
                    bolterLog = `Boltered ${member.bolters} times`;
                }
                else {
                    bolterLog = "Did not bolter";
                }
            }
            const achievementsThisOp = info.awards.filter(a => a.afterOpId == op.id);
            let achievementLogText = [];
            achievementsThisOp.forEach(a => {
                if (a.type == "fiveOpsWithoutBolter")
                    achievementLogText.push("Safety 'S' Award");
                if (a.type == "fiveOpsWithoutDeath")
                    achievementLogText.push("Golden Wrench Award");
            });
            const achievementLog = achievementLogText.length > 0 ? `Achievements: ${achievementLogText.join(", ")}` : "";
            opLog += `${op.name}, ${op.timeslot}: ${deathLog}, ${bolterLog}, Wire: ${member.wire ?? "N/A"}, Remarks: ${member.remarks ?? "N/A"} ${achievementLog}\n`;
            if (!uOpNames.has(op.name)) {
                uOps++;
                uOpNames.add(op.name);
            }
            tOps++;
            if (member.wire) {
                totalWireScore += wireScore(member.wire);
                totalWireCounts++;
            }
        });
        let highestQualifyRank = qualifyRanks[0];
        for (let i = 0; i < qualifyRanks.length; i++) {
            if (uOps >= qualifyRanks[i].uOps && tOps >= qualifyRanks[i].tOps) {
                highestQualifyRank = qualifyRanks[i];
            }
        }
        const embed = new EmbedBuilder();
        embed.setTitle(`Op Record for ${userEntry.username}`);
        embed.addFields([
            {
                name: `Ops attended`,
                value: info.opsAttended.length.toString(),
                inline: true
            },
            {
                name: `Unique ops attended`,
                value: uOps.toString(),
                inline: true
            },
            {
                name: `Ops without death`,
                value: info.fullOpsWithoutDeath.toString(),
                inline: true
            },
            {
                name: `Ops without bolter`,
                value: info.fullOpsWithoutBolter.toString(),
                inline: true
            },
            {
                name: "Golden Wrench Awards",
                value: fiveOpsWithoutBolterCount.toString(),
                inline: true
            },
            {
                name: "Safety 'S' Awards",
                value: fiveOpsWithoutDeathCount.toString(),
                inline: true
            },
            {
                name: "Highest Qualified Rank",
                value: highestQualifyRank.rank,
                inline: true
            },
            {
                name: "Average Wire Score",
                value: (totalWireScore / totalWireCounts).toFixed(2),
                inline: true
            }
        ]);
        // const attachment = new (await app.elo.getUserLog(user.id, targetSeason, achievementLogText), "history.txt");
        // const files = [attachment];
        const attachment = new AttachmentBuilder(Buffer.from(opLog), { name: "history.txt" });
        interaction.reply({ embeds: [embed], files: [attachment] });
    }
    async handleAutocomplete({ interaction, app }) {
        const focusedValue = interaction.options.getFocused(true);
        if (focusedValue.name != "name") {
            await interaction.respond([]);
            return;
        }
        const timeSinceLastLookup = Date.now() - Lookup.lastNameLookupTime;
        // 1 minute
        if (timeSinceLastLookup > 1000 * 60) {
            Lookup.lastNameLookupTime = Date.now();
            const users = await app.users.get();
            Lookup.lastNames = users.map(u => u.username);
        }
        const query = focusedValue.value.toLowerCase();
        const primaryOptions = Lookup.lastNames.filter(n => n.toLowerCase().startsWith(query));
        const secondaryOptions = Lookup.lastNames.filter(n => n.toLowerCase().includes(query) && !primaryOptions.includes(n));
        const options = [...primaryOptions, ...secondaryOptions].map(n => ({ name: n, value: n })).slice(0, 25);
        await interaction.respond(options);
    }
}
__decorate([
    __param(1, SArg({ autocomplete: true, minLength: 3, maxLength: 32, required: false })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SlashCommandEvent, String]),
    __metadata("design:returntype", Promise)
], Lookup.prototype, "run", null);
export default Lookup;
//# sourceMappingURL=lookup.js.map