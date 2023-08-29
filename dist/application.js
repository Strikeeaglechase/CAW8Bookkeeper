var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import Archiver from "archiver";
import fs from "fs";
import path from "path";
import { GoogleSheetParser } from "./parseSheets.js";
const SHEET_ID = "12Fr3aL16m1-uuL3e1R_z4ErUH2lc8dktgpePyUloQHs";
class Application {
    constructor(framework) {
        this.framework = framework;
        this.log = framework.log;
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log.info(`Application has started!`);
        });
    }
    runSheetUpdate() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log.info("Starting to parse sheets!");
            if (!fs.existsSync("../results"))
                fs.mkdirSync("../results");
            const parser = new GoogleSheetParser(SHEET_ID, this.framework);
            yield parser.init();
            const result = yield parser.run();
            if (!result)
                return;
            this.log.info(`Got sheets result, writing to archive`);
            const { achievementHistory, memberHistory } = result;
            const archive = Archiver("zip");
            const resultPath = path.resolve(`../results/${new Date().toISOString().split(":").join("")}.zip`);
            const output = fs.createWriteStream(resultPath);
            const completionPromise = new Promise(res => output.on("close", () => {
                res();
            }));
            archive.pipe(output);
            archive.append(achievementHistory, { name: "achievements.txt" });
            Object.keys(memberHistory).forEach(member => {
                const name = member.split(" ").join("_");
                archive.append(memberHistory[member], { name: `${name}.txt` });
            });
            archive.finalize();
            yield completionPromise;
            this.log.info("Finished parsing sheets!");
            return resultPath;
        });
    }
}
export { Application };
