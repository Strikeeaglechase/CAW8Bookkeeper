import { Constructor, SlashCommand, SlashCommandParent } from "strike-discord-framework/dist/slashCommand.js";

import { Application } from "../../application.js";
import OpCreate from "./opCreate.js";
import OpDisplay from "./opDisplay.js";
import OpEnable from "./opEnable.js";
import OpEnd from "./opEnd.js";
import OpSet from "./opSet.js";
import OpSetSlot from "./opSetSlot.js";
import OpUpload from "./opUpload.js";

export async function opNameAutocomplete(app: Application, queryInput: string) {
	const uOpNames: Set<string> = new Set();
	const ops = await app.ops.get();
	ops.forEach(op => uOpNames.add(op.name));
	const opNames = [...uOpNames];

	const query = queryInput.toLowerCase();
	const primaryOptions = opNames.filter(n => n.toLowerCase().startsWith(query));
	const secondaryOptions = opNames.filter(n => n.toLowerCase().includes(query) && !primaryOptions.includes(n));
	const options = [...primaryOptions, ...secondaryOptions].map(n => ({ name: n, value: n })).slice(0, 25);

	return options;
}

class Op extends SlashCommandParent {
	name = "op";
	description = "Op related commands";

	getSubCommands(): Constructor<SlashCommand>[] {
		return [OpCreate, OpDisplay, OpSet, OpSetSlot, OpEnable, OpUpload, OpEnd];
	}
}

export default Op;
