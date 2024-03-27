import { CommandInteraction } from "discord.js";
import { Constructor, SlashCommand, SlashCommandAutocompleteEvent, SlashCommandParent } from "strike-discord-framework/dist/slashCommand.js";

import { Application } from "../../application.js";
import EditAircraft from "./editAircraft.js";
import EditBolters from "./editBolters.js";
import EditCombatDeaths from "./editCombatDeaths.js";
import EditCompletion from "./editCompletion.js";
import EditPromotion from "./editPromotions.js";
import EditRemarks from "./editRemarks.js";
import EditSlot from "./editSlot.js";
import EditWire from "./editWire.js";

export async function opMemberNameAutocompleteHandler({ interaction, app }: SlashCommandAutocompleteEvent<Application>, opId: string) {
	if (!opId) {
		await interaction.respond([]);
		return;
	}

	const op = await app.ops.get(opId);
	if (!op) {
		await interaction.respond([]);
		return;
	}

	const focusedValue = interaction.options.getFocused(true);
	const query = focusedValue.value.toLowerCase();
	const names = op.members.map(m => m.name);
	const primaryOptions = names.filter(n => n.toLowerCase().startsWith(query));
	const secondaryOptions = names.filter(n => n.toLowerCase().includes(query) && !primaryOptions.includes(n));
	const options = [...primaryOptions, ...secondaryOptions].map(n => ({ name: n, value: n })).slice(0, 25);
	await interaction.respond(options);
}

export async function resolveOpOrError(interaction: CommandInteraction, app: Application) {
	const activeOpId = app.userSelectedOps[interaction.user.id];
	if (!activeOpId) {
		await interaction.reply(app.framework.error("The command `/op edit` must be run before you can edit a record"));
		return null;
	}

	const op = await app.ops.get(activeOpId);
	if (!op) {
		await interaction.reply(app.framework.error("The op you are trying to edit does not exist"));
		return null;
	}

	return op;
}

export const requireConfirmation = false;

class Edit extends SlashCommandParent {
	name = "edit";
	description = "Edits a record on an op";

	getSubCommands(): Constructor<SlashCommand>[] {
		return [EditSlot, EditAircraft, EditCompletion, EditCombatDeaths, EditBolters, EditWire, EditPromotion, EditRemarks];
	}
}

export default Edit;
