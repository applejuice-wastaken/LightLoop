const Discord = require('discord.js'); // eslint-disable-line no-unused-vars
const { SlashCommandBuilder } = require('@discordjs/builders');
const { startDialog, canStartDialog } = require('../../dialogs/startDialog');
const DataStorage = require('../../util/dataStorage');
const utility = require('../../util/utility');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Creates a Modmail Ticket.'),
    usage: '`/ticket` - Create a Modmail Ticket.',
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
    async execute(interaction) {
        if (canStartDialog(interaction.client, interaction.user)) {
            // Only one ticket per person can exist at the same time
            if (!DataStorage.storage.tickets?.find(x => x.author == interaction.user.id)) {
                await interaction.user.send(utility.buildEmbed('Modmail Ticket', 'We will now ask for details, if you want to cancel this process just send "cancel". Your username will not be included in your ticket.'));
                startDialog(interaction.client, interaction.user, 'createTicket');
                interaction.reply({ embeds: [{ description: 'I have sent you a DM.' }], ephemeral: true });
            }
            else {
                interaction.reply({ embeds: [{ description: 'You already have an open ticket.' }], ephemeral: true });
            }
        }
        else {
            interaction.reply({ embeds: [{ description: 'Please finish the current dialog first.' }], ephemeral: true });
        }
    },
};