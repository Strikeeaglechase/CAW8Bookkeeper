import { SlashCommand, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { Application } from "../application.js";
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

class ArmGuide extends SlashCommand {
  name = "arm";
  description = "Imports armament links from VTOL VR Wiki";

  public override async run({ interaction, app }: SlashCommandEvent<Application>) {
    if (!(await app.isAuthed(interaction))) return;

    await interaction.deferReply({ ephemeral: true });
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(
        'https://vtolvr.wiki.gg/api.php?action=query&format=json&list=categorymembers&cmtitle=Category:Armament&cmlimit=max'
      );

      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.query || !data.query.categorymembers) {
        throw new Error('No data found in the response');
      }

      const armaments = data.query.categorymembers;

      const embeds = [];
      let currentEmbed = new EmbedBuilder()
        .setTitle('Armaments List')
        .setColor('Gold')
        .setThumbnail(
          'https://static.wiki.gg/skins/common/images/wiki.png'
        )
        .setDescription('List of armaments from VTOL VR Wiki');
      let fieldCount = 0;

      armaments.forEach((armament, index) => {
        currentEmbed.addFields({
          name: armament.title,
          value: `Link: [${armament.title
            }](https://vtolvr.wiki.gg/wiki/${encodeURIComponent(
              armament.title
            )})`,
          inline: false
        });
        fieldCount++;

        if (fieldCount === 9) {
          currentEmbed.setFooter({ text: `Page ${embeds.length + 1} of ` });
          embeds.push(currentEmbed);
          currentEmbed = new EmbedBuilder()
            .setTitle('Armaments List')
            .setColor('Gold')
            .setDescription(
              'Continued list of armaments from VTOL VR Wiki'
            )
            .setThumbnail(
              'https://static.wiki.gg/skins/common/images/wiki.png'
            );
          fieldCount = 0;
        }
      });

      if (fieldCount > 0) {
        currentEmbed.setFooter({ text: `Page ${embeds.length + 1} of ` });
        embeds.push(currentEmbed);
      }

      embeds.forEach((embed, index) => {
        embed.setFooter({ text: `Page ${index + 1} of ${embeds.length}` });
      });

      if (embeds.length === 0) {
        await interaction.editReply('No armament data found.');
        return;
      }

      const getActionRow = currentIndex => {
        return new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('prev')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(currentIndex === 0),
          new ButtonBuilder()
            .setCustomId('next')
            .setLabel('Next')
            .setStyle(ButtonStyle.Success)
            .setDisabled(currentIndex === embeds.length - 1)
        );
      };

      let currentIndex = 0;

      const filter = i => i.user.id === interaction.user.id;
      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 60000
      });

      collector.on('collect', async i => {
        if (i.customId === 'prev') {
          currentIndex--;
        } else if (i.customId === 'next') {
          currentIndex++;
        }

        await i.update({
          embeds: [embeds[currentIndex]],
          components: [getActionRow(currentIndex)]
        });
      });

      await interaction.editReply({
        embeds: [embeds[currentIndex]],
        components: [getActionRow(currentIndex)]
      });
    } catch (error) {
      console.error('Error:', error);
      await interaction.editReply(`Failed to fetch data: ${error.message}`);
    }
  }
}

export default ArmGuide;