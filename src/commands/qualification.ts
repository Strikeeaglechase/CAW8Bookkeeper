import { SlashCommand, SlashCommandEvent } from "strike-discord-framework/dist/slashCommand.js";
import { Application } from "../application.js";
import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelType,
    GuildMemberRoleManager,
    ModalActionRowComponentBuilder,
    CacheType,
    ModalSubmitInteraction
} from "discord.js";

class Qualification extends SlashCommand {
  name = "qualification";
  description = "Request for a qualification";

  public override async run({ interaction, app }: SlashCommandEvent<Application>) {
    if (!(await app.isAuthed(interaction))) return;

    await interaction.deferReply();

    try {
      const student = interaction.user;
      const adminRoleId = 'xxxxxxxx'; // Replace with your Admin role ID
      const fixedChannelId = 'xxxxxxxx'; // Fixed voice channel ID

      let instructorTags: string[] = []; // Array to hold the tags of instructors

      const embed = new EmbedBuilder()
        .setTitle('Qualification Request')
        .setColor('Green')
        .setDescription(`**Instructor:** \n**Student:** <@${student.id}>`)
        .setFooter({ text: 'Admins can join or leave the qualification' });

      const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('join')
          .setLabel('Join')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('leave')
          .setLabel('Leave')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('lock')
          .setLabel('Lock')
          .setStyle(ButtonStyle.Primary)
      );

      const message = await interaction.editReply({
        embeds: [embed],
        components: [actionRow],
      });

      const filter = (i: { customId: string; }) => ['join', 'leave', 'lock'].includes(i.customId);

      const collector = message.createMessageComponentCollector({ filter, time: 60000 });

      collector.on('collect', async i => {
        if (!(i.member?.roles instanceof GuildMemberRoleManager) || !i.member.roles.cache.has(adminRoleId)) {
          await i.reply({ content: 'You do not have permission to use these buttons.', ephemeral: true });
          return;
        }

        if (i.customId === 'join') {
          if (!instructorTags.includes(`<@${i.user.id}>`)) {
            instructorTags.push(`<@${i.user.id}>`);
          }
          embed.setDescription(`**Instructor:** ${instructorTags.join(', ')}\n**Student:** <@${student.id}>`);
          await i.update({ embeds: [embed], components: [actionRow] });
        } else if (i.customId === 'leave') {
          instructorTags = instructorTags.filter(tag => tag !== `<@${i.user.id}>`);
          embed.setDescription(`**Instructor:** ${instructorTags.join(', ')}\n**Student:** <@${student.id}>`);
          await i.update({ embeds: [embed], components: [actionRow] });
        } else if (i.customId === 'lock') {
          const modal = new ModalBuilder()
            .setCustomId('qualificationModal')
            .setTitle('Qualification Details')
            .addComponents(
              new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
                new TextInputBuilder()
                  .setCustomId('timeInput')
                  .setLabel('Qualification Time')
                  .setStyle(TextInputStyle.Short)
                  .setPlaceholder('Enter qualification time (e.g. 2024-07-26T15:00:00)')
                  .setRequired(true)
              )
            );

          await i.showModal(modal);

          const modalFilter = (modalSubmit: ModalSubmitInteraction<CacheType>) =>
            modalSubmit.customId === 'qualificationModal' && modalSubmit.user.id === i.user.id;

          const modalCollector = i.awaitModalSubmit({ filter: modalFilter, time: 60000 });

          modalCollector
            .then(async modalSubmit => {
              const timeInput = modalSubmit.fields.getTextInputValue('timeInput');
              const time = new Date(timeInput);
              const timestamp = `<t:${Math.floor(time.getTime() / 1000)}:F>`;
              const channel = interaction.guild.channels.cache.get(fixedChannelId);

              if (!channel || channel.type !== ChannelType.GuildVoice) {
                await modalSubmit.reply({ content: 'The specified channel is not a voice channel.', ephemeral: true });
                return;
              }

              const lockEmbed = new EmbedBuilder()
                .setTitle('Qualification Locked')
                .setColor('Red')
                .setDescription(`The qualification request has been locked.\n\n**Instructor:** ${instructorTags.join(', ')}\n**Student:** <@${student.id}>`);

              await modalSubmit.editReply({ embeds: [lockEmbed], components: [] });

              const dmEmbed = new EmbedBuilder()
                .setTitle('Qualification Details')
                .setColor('Green')
                .setDescription(`Here are the details for your qualification:\n\n**Instructor:** ${instructorTags.join(', ')}\n**Student:** <@${student.id}>\n**Time:** ${timestamp}\n**Channel:** <#${fixedChannelId}>`);

              try {
                await student.send({ embeds: [dmEmbed] });
              } catch (dmError) {
                console.error('Failed to send DM:', dmError);
              }
            })
            .catch(async error => {
              console.error('Failed to submit modal:', error);
              await i.editReply({ content: 'Failed to lock the qualification request.', components: [] });
            });
        }
      });

      collector.on('end', async collected => {
        try {
          await message.edit({ components: [] });
        } catch (error) {
          if (error.code !== 10008) {
            console.error('Failed to edit message:', error);
          } else {
            console.log('Message was deleted before it could be edited.');
          }
        }
      });

    } catch (error) {
      console.error('Error:', error);
      await interaction.editReply(`Failed to create qualification request: ${error.message}`);
    }
  }
}

export default Qualification;