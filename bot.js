const Discord = require('discord.io');
const logger = require('winston');
const auth = require('./auth.json');
import Api from './api';
import utilities from './utilities';
import vendorEngramsConfig from './vendorEngramsConfig';

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
  colorize: true
});

logger.level = 'debug';

// Initialize Discord Bot
var bot = new Discord.Client({
   token: auth.token,
   autorun: true
});

var randomGames = [
  'Stealing your glimmer...',
  'Try !glimmer',
  'Try !bankamount',
  'Try !buyengram',
  'Try !gamble',
  'Try !robbank',
  'Try !battle',
  'Hoarding exotics...',
  'Snorting bright dust',
];

bot.on('ready', function (evt) {
  logger.info('Connected');
  logger.info('Logged in as: ');
  logger.info(bot.username + ' - (' + bot.id + ')');

  setInterval(() => {
    let rand = Math.floor(Math.random() * 8);
    bot.setPresence({ status: 'online', game: { name: randomGames[rand] }});
  }, 60000);
});


bot.on('message', function (user, userId, channelId, message, evt) {
  try {
    const api = new Api(bot, channelId);

    // dont respond to ourself
    if (userId == bot.id)
      return;

    // add 5 glimmer to user per message
    if (message[0] !== '!' && message.length >= 10)
      api.updateGlimmer(userId, user);

    // gamble
    if (message.split(' ')[0] === '!gamble') {
      let amount = message.split(' ')[1];
      api.gambleGlimmer(userId, amount);
    }

    // get current glimmer for a user
    if (message === '!glimmer')
      api.getCurrentGlimmer(userId);

    // get current light for a user
    if (message === '!light')
     api.getCurrentLight(userId);

    if (message === '!buyengram') {
      let roll = Math.floor(utilities.randomNumberBetween(1, 100));
      if (roll < 5)
        api.rahoolIsADick(userId);
      else
        api.getEngram(userId);
    }

    if (message === '!lightrank')
      api.getLightRank();

    if (message === '!loadout')
      api.getLoadout(userId);

    if (message === '!gamblehelp') {
      let message = `<@${userId}> type !gamble amount to gamble your glimmer. The bot will roll a number between 1 and 100. The higher the number, the better payout you will receive. If the number is very low, you may lose your glimmer. Gamble wisely!`;
       bot.sendMessage({
         to: channelId,
         message
      });
    }

    if (message === '!bankamount')
      api.getBankAmount();

    if (message === '!howtorobbank') {
      let message =`The global glimmer bank is protected by a secret number that is randomized between 1 and 100 constantly. `;
      message += `You can attempt to rob the glimmer bank by guessing the secret number. If you guess it correctly, you will open the vault and escape with all the glimmer. `;
      message += `If you guess wrong and are caught by the glimmer police, you will be fined. Type **!robbank guess** to attempt.`;
       bot.sendMessage({
         to: channelId,
         message
      });
    }

    // try to rob the bank
    if (message.split(' ')[0] === '!robbank') {
      let guess = message.split(' ')[1];
      if (!guess) {
        bot.sendMessage({
          to: channelId,
          message: `<@${userId}>, you should probably guess a secret number (1-100) if you wanna rob the bank. **!robbank SECRET_NUMBER**`
        });
      }
      api.robBank(userId, guess);
    }


    if (message === '!gambleodds') {
      // 17% chance of winning your gamble, 
      // 12% chance of doubling your wager, 
      // 5% chance of tripling it
      // 23% chance of breaking even, 
      // 36% chance of losing the gamble,
      // 7% chance of losing double your gamble
      // the higher the roll the better
      let message = `<@${userId}> the gambling odds are: \n` +
                    `7% chance to lose double your glimmer (1-7).\n`+
                    `36% chance to lose your original amount (8-43).\n`+
                    `23% chance of breaking even (44-66).\n` +
                    `17% chance of winning your original amount (67-83).\n` +
                    `12% chance of winning double your gamble (84-95).\n` +
                    `5% chance of tripling your gamble (96-100).`;
      bot.sendMessage({
        to: channelId,
        message
      });
    }

    // battle
    if (message.split(' ')[0] === '!battle') {
      let tier = message.split(' ')[1];
      if (!tier || isNaN(tier) || tier < 1 || tier > 8) {
        bot.sendMessage({
          to: channelId,
          message: `<@${userId}>, please select a tier (1-8) of enemy to battle. **!battle ENEMY_TIER**`
        });
      }
      else 
        api.battle(userId, tier);
    }

    if (message === '!battlecooldown')
      api.getBattleCooldown(userId);

    //loan
    if (message.split(' ')[0] === '!loan') {
      if (message.split(' ').length < 3) {
        bot.sendMessage({
          to: channelId,
          message: `<@${userId}> please specify an amount and someone to loan to. **!loan amount @user**.`
        })
      }
      else {
        let amount = Number(message.split(' ')[1]);
        if (amount < 1) {
          bot.sendMessage({
            to: channelId,
            message: `<@${userId}> you can't loan less than 1 glimmer.`
          });
        }
        else {
          let loanTo = message.split(' ')[2];

          // extract the loanTo id from the <@id> string
          // sometimes there's a random ! at the beginning also
          let loanToId = loanTo.substring(2, loanTo.length - 1);
          if (loanToId[0] == '!') 
            loanToId = loanToId.substring(1, loanTo.length - 1);

          if (isNaN(loanToId)) {
            bot.sendMessage({
              to: channelId,
              message: `<@${userId}> that user doesn't exist.`
            });
          }
          else if (isNaN(amount)) {
            bot.sendMessage({
              to: channelId,
              message: `<@${userId}> that isn't a number, dumbass.`
            });
          }
          else 
            api.loan(userId, amount, loanToId);
        }
      }
    }

    // repay loan
    if (message.split(' ')[0] === '!repay') {
      if (message.split(' ').length < 3) {
        bot.sendMessage({
          to: channelId,
          message: `<@${userId}> please specify an amount and someone to repay. **!repay amount @user**.`
        })
      }
      else {
        let amount = Number(message.split(' ')[1]);
        if (amount < 1) {
          bot.sendMessage({
            to: channelId,
            message: `<@${userId}> you can't repay less than 1 glimmer.`
          });
        }
        else {
          let repayTo = message.split(' ')[2];

          // extract the repayTo id from the <@id> string
          // sometimes there's a random ! at the beginning also
          let repayToId = repayTo.substring(2, repayTo.length - 1);
          if (repayToId[0] == '!') 
            repayToId = repayToId.substring(1, repayTo.length - 1);

          if (isNaN(repayToId)) {
            bot.sendMessage({
              to: channelId,
              message: `<@${userId}> that user doesn't exist.`
            });
          }
          else if (isNaN(amount)) {
            bot.sendMessage({
              to: channelId,
              message: `<@${userId}> that isn't a number, dumbass.`
            });
          }
          else 
            api.repay(userId, amount, repayToId);
        }
      }
    }

    // collect loan
    if (message.split(' ')[0] === '!collect') {
      if (message.split(' ').length < 3) {
        bot.sendMessage({
          to: channelId,
          message: `<@${userId}> please specify an amount and someone to collect from. **!collect amount @user**.`
        })
      }
      let amount = Number(message.split(' ')[1]);

      if (amount < 1) {
        bot.sendMessage({
          to: channelId,
          message: `<@${userId}> you can't collect less than 1 glimmer.`
        });
      }
      else {
        let collectFrom = message.split(' ')[2];

        // extract the collectFrom id from the <@id> string
        // sometimes there's a random ! at the beginning also
        let collectFromId = collectFrom.substring(2, collectFrom.length - 1);
        if (collectFromId[0] == '!') 
          collectFromId = collectFromId.substring(1, collectFrom.length - 1);

        if (isNaN(collectFromId)) {
          bot.sendMessage({
            to: channelId,
            message: `<@${userId}> that user doesn't exist.`
          });
        }
        else if (isNaN(amount)) {
          bot.sendMessage({
            to: channelId,
            message: `<@${userId}> that isn't a number, dumbass.`
          });
        }
        else 
          api.collect(userId, amount, collectFromId);
      }
    }

    // check who you owe to
    if (message === '!debt') {
      api.getDebt(userId);
    }

    // mainframe fragementation rate
    if (message === '!frag') {
      api.getFragmentationRate();
    }

    if (message.split(' ')[0] === '!defrag') {
      if (message.split(' ').length < 2) {
        bot.sendMessage({
          to: channelId,
          message: `<@${userId}> please specify an amount to donate to defragmentation repairs. **!defrag AMOUNT**`
        });
      }
      else {
        let amount = Number(message.split(' ')[1]);
        if (isNaN(amount)) {
          bot.sendMessage({
            to: channelId,
            message: `<@${userId}> that isn't a number. **!defrag AMOUNT**`
          });
        }
        else 
          api.defragGlimmerMainframe(userId, amount);
      }
    }

    if (message === '!aboutfrag') {
      let message = `Glimmer is a programmable currency which is kept track of in the Glimmer Mainframe. With each glimmer transaction, the Mainframe hardware fragments, and the volatility of the glimmer economy rises. If the Mainframe reaches 100% fragmentation, it will crash, `;
      message += `destroying the glimmer economy and wiping all glimmer from the system. Larger transactions fragment the Mainframe faster. Type **!frag** to check the current fragmentation rate.`;
      bot.sendMessage({
        to: channelId,
        message
      });
    }
  }
  catch (e) {
    logger.error(`Error in general bot commands: ${e}.`);
  }
});

// set interval to check for 300 level vendor engrams
setInterval(() => {
  try {
    let vendorApi = new Api(bot, vendorEngramsConfig.channelId)
    vendorApi.get300Vendors();
  }
  catch (e) {
    logger.error(`Error getting vendor engrams: ${e}.`);
  }
}, 480000);


// disconnect
bot.on('disconnect', function(msg, code) {
  logger.info(`Bot disconnected from Discord with code ${code}, message: ${msg}.`)
  bot.connect();
});
