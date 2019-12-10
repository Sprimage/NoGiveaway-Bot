//Import needed libraries and files
const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json')
//Global vars,will be removed once db integration is complete
var list;
var blacklistedmatches = 0;
var bancount = 0;
//Blacklisted avatars
const blacklistedavatars = config.blacklistedavatars;
//whitelist the real giveaway bot and nogiveaway bot
const whitelistedids = config.whitelistedids;
var extrablacklist = config.blacklistedidsextra;
var blacklistedids = [];

//Executes when connected successfully after login with token
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity(`Protecting ${client.guilds.size} servers from giveaway spam`);
});

// This event triggers when the bot joins a guild.
client.on("guildCreate", guild => {
    // This event triggers when the bot joins a guild.
    console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
    //Add guild to db,needs changes
    addGuildtoDB(guild.id);
    client.user.setActivity(`Protecting ${client.guilds.size} servers from giveaway spam`);
});

// Create an event listener for new guild members
client.on('guildMemberAdd', member => {
    // Send the message to a designated channel on a server:
    const channel = member.guild.channels.find(ch => ch.name === 'member-log');
    // Do nothing if the channel wasn't found on this server
    if (!channel) return;
    //check if user joined has a blacklisted avatar hash
    checkForBlacklistedAvatarandBan(member)
    // Send the message, mentioning the member
    channel.send(`Welcome to the server, ${member}`);
  });

client.on('message', msg => {

    //Check if there is a guild in message,dont go further if its a dm.
    if (!msg.guild) return;

    if (msg.content === 'ping') {
        msg.reply('pong');
    } else if (msg.content === 'buildblacklist') {
        buildBlacklist(msg);
        msg.reply("Built Blacklist");
    } else if (msg.content === 'getblacklistcount') {
        msg.reply(blacklistedmatches);
    } else if (msg.content === 'banBlacklisted') {
        banBlacklisted(msg,false,null);
    } else if (msg.content === 'banextra') {
        banBlacklisted(msg, true,null);
    }

});
//Login to discord with token
client.login(config.token);

//Builds blacklist array
async function buildBlacklist(msg) {
    if (blacklistedids.length > 0 || bancount > 0 || blacklistedmatches > 0) {
        //reset fields,just incase as we only support one server for now per instance
        blacklistedids = [];
        bancount = 0
        blacklistedmatches = 0
    }
    //Get guild from msg invoking this command
    list = msg.guild;
    if (list != undefined)
    //Fetch members,using fetchmemebers are users are normally greater than 250 on crypto servers
    list.fetchMembers().then(code => {
         code.members.forEach(member=>{
            //Check if user has giveaway,ownerbit or magic in username and isnt in whitelist
            if (member.user.username.toLowerCase().includes("giveaway") &&
                member.user.id != whitelistedids[0] &&
                member.user.id != whitelistedids[1] ||
                member.user.username.toLowerCase().includes("ownerbit") &&
                (member.user.username != "NoGiveaway" || member.user.username != "GiveawayBot"
                || member.user.username == "MAGIC" || member.user.username.toLowerCase().includes("aerobit"))) {
                console.log("Adding blacklisted userid :" + member.user.id);
                blacklistedmatches = blacklistedids.push(member.user.id);
            } else {
                //Some may use a different name,then fall back to profile picture checker
                checkForBlacklistedAvatar(member.user)
            }
        });
    });
}
function addGuildtoDB(guildid){
    //Write db code here

}

function checkForBlacklistedAvatar(user) {
    blacklistedavatars.forEach(function(item) {
        if (user.avatar != null && user.avatar.includes(item.toString())) {
            console.log("Adding blacklisted userid :" + user.id);
            blacklistedmatches = blacklistedids.push(user.id);
        }
    });
}

function checkForBlacklistedAvatarandBan(user) {
    blacklistedavatars.forEach(function(item) {
        if (user.user.avatar != null && user.user.avatar.includes(item.toString())) {
            console.log("Adding blacklisted userid :" + user.id);
            blacklistedmatches = blacklistedids.push(user.user.id);
            banBlacklisted(null,false,user)
        }
    });
}

async function banBlacklisted(msg, fBanExtra,memberx) {
        if (fBanExtra) {blacklistedids.concat(extrablacklist)}
        blacklistedids.forEach(function(item) {
            var member;
            if(msg != null)
               member = msg.guild.member(item);
            else
                member = memberx

            if (member) {
                member.ban({
                    reason: 'SpamBot',
                }).then(() => {
                    // We let the message author know we were able to ban the person
                    ++bancount;
                    console.log("Banned sucessfully :" + bancount)
                    if (bancount == blacklistedmatches) {
                       // Sends the RichEmbed in the modlogchannel
                        sendBanReport(msg)
                        //Clear all count after banning list,TODO Add db based counts for each guild isntead
                        blacklistedids = [];
                        bancount = 0;
                        blacklistedmatches = 0;
                    }
                }).catch(err => {
                    // An error happened
                    // This is generally due to the bot not being able to ban the member,
                    // either due to missing permissions or role hierarchy
                    msg.reply('I was unable to ban the member');
                    // Log the error
                    console.error(err);
                });
            } else {
                // The mentioned user isn't in this guild
                msg.reply('That user isn\'t in this guild!');
            }
        });
}

function sendBanReport(msg){
    const banConfirmationEmbedModlog = new Discord.RichEmbed()
    .setAuthor(`Banned Spammers by **${msg.author.username}#${msg.author.discriminator}**`, msg.author.displayAvatarURL)
    .setColor('RED')
    .setTimestamp()
    .setDescription(`**Action**: Ban
**Bancount**: ${bancount}
**Reason**: SpamBot`);
client.channels.get(msg.channel.id).send({
    embed: banConfirmationEmbedModlog
});
}