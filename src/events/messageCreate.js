const Discord = require('discord.js'); // eslint-disable-line no-unused-vars
const ScamFilter = require('../filters/scamFilter');
const NsfwFilter = require('../filters/nsfwFilter');
const ShowcaseFilter = require('../filters/showcaseFilter');
const FaqFilter = require('../filters/faqFilter');
const utility = require('../util/utility');

const { transform } = require('../message/transformer');
const { generateText, escape } = require('../message/failhandler');
const { split } = require('../message/parser');
const { pad } = require('../util/utility');

module.exports = {
    name: 'messageCreate',
    /**
     * 
     * @param {Discord.Message} message 
     */
    async execute(message) {

        if (message.author.id == message.client.user.id) return; // Ignore self

        // Prefix commands handling
        if (message.content.startsWith(process.env.PREFIX)) {

            if (message.author.bot) return; // Ignore bots

            // we cannot fully split the arguments because of the experimental transformer
            const content = message.content.substring(process.env.PREFIX.length);

            let index = content.indexOf(' ');

            if (index === -1) {
                index = content.length;
            }

            const unparsedArgs = content.substring(index);
            const commandName = content.substring(0, index);

            const command = message.client.prefixCommands.get(commandName);

            // If command doesnt exist, return
            if (!command) return;

            // Only allow commands that have dm property set to true in DMs
            if (message.channel.type == 'DM' && !command.dm) return message.channel.send(utility.buildEmbed('Commands don\'t work in DMs.'));

            // If not in main guild only allow specific commands
            if (message.guild?.id != process.env.MAIN_GUILD && !command.allowInOtherGuilds) return;

            // Check if command needs moderator or helper perms
            let isAllowedToUse = false;
            if (command.moderator) {
                isAllowedToUse |= utility.isModerator(message.member);
            }
            if (command.helper) {
                isAllowedToUse |= utility.isHelper(message.member);
            }
            if (!command.moderator && !command.helper) {
                isAllowedToUse = true;
            }
            if (!isAllowedToUse) return;

            // Remove any expired cooldowns
            message.client.cooldowns.forEach((userCooldowns) => {
                for (const key in userCooldowns) {
                    if (Object.hasOwnProperty.call(userCooldowns, key)) {
                        const cooldown = userCooldowns[key];
                        if (cooldown < Date.now()) {
                            delete userCooldowns[key];
                        }
                    }
                }
                if (Object.keys(userCooldowns).length == 0) {
                    message.client.cooldowns.delete(message.author.id);
                }
            });
            // Check for cooldowns (Moderators are immune)
            if (command.cooldown && !utility.isModerator(message.member)) {
                let userCooldowns;
                if (message.client.cooldowns.has(message.author.id)) {
                    userCooldowns = message.client.cooldowns.get(message.author.id);
                }
                else {
                    userCooldowns = {};
                }
                // If a cooldown for the command is still there after removing expired ones, return
                if (userCooldowns[command.name]) {
                    const timeLeft = (userCooldowns[command.name] - Date.now()) / 1000;
                    return message.channel.send(utility.buildEmbed('Please wait ' + (timeLeft > 60 ? (timeLeft / 60).toFixed(2) + ' minutes' : timeLeft.toFixed(2) + ' seconds') + ' before using this command again.'));
                }
                // Add new cooldown to user
                userCooldowns[command.name] = Date.now() + command.cooldown;
                message.client.cooldowns.set(message.author.id, userCooldowns);
            }

            let provider;
            let executor;

            if (command.experimental) {
                try {
                    const splitted = split(unparsedArgs);

                    if (splitted.fail) {
                        await message.reply(escape(splitted.reason));
                        return;
                    }

                    let overloads;

                    if ('arguments' in command) {
                        overloads = [command];
                    }
                    else {
                        overloads = command.overloads;
                    }

                    const failComposite = [];
                    let failed = true;

                    for (let i = 0; i < overloads.length; i++) {
                        const transformation = await transform(message, unparsedArgs, splitted.value, overloads[i].arguments);

                        if (transformation.fail) {
                            failComposite.push(generateText(splitted.value, overloads[i].arguments, transformation));
                        }
                        else {
                            provider = [message, transformation.value];
                            executor = overloads[i].execute;
                            failed = false;
                            break;
                        }
                    }

                    if (failed) {
                        await message.reply(`\`\`\`\nError while parsing arguments (Least Prioritised Overload Last)\n${pad(failComposite.join('\n\n'), '    ')}\`\`\``);
                        return;
                    }
                }
                catch (error) {
                    console.error(error);
                    await message.reply('There was an error while parsing this command');
                }
            }
            else {
                provider = [message, unparsedArgs.split(/ +/)];
                executor = command.execute;
            }

            // Execute the command
            try {
                executor(...provider);
            }
            catch (error) {
                console.error(error);
            }
        }
        // If not a command and in a guild (not in DM), do some chat filter stuff
        else if (message.guild) {
            ScamFilter.filter(message);
            NsfwFilter.filter(message);
            ShowcaseFilter.filter(message);
            FaqFilter.filter(message);
        }
    },
};
