const WORDS = require('fs').readFileSync(require('path').join(__dirname, '..', 'json', 'words_csw.txt'), 'utf8').toLowerCase().split('\n');
const WORDS_COMMON = require('fs').readFileSync(require('path').join(__dirname, '..', 'json', 'words_10k.txt'), 'utf8').toLowerCase().split('\n');
const WORDS_NORMAL = WORDS_COMMON.filter(w => w.length > 5);
console.log("word list length =", WORDS_NORMAL.length);
const GAMES = {};

exports.handleCommand = function (args, msg, PREFIX) {
    if (args.length === 0) {
        if (GAMES[msg.author.id] && Date.now() - GAMES[msg.author.id].start < 60000) return msg.reply("Chill... (game not deleted)");
        let word = WORDS_NORMAL[Math.floor(WORDS_NORMAL.length * Math.random())];
        let game = GAMES[msg.author.id] = {
            characters: shuffleArray(word.split('')),
            word: word,
            start: Date.now()
        };
        msg.reply('Your characters are `' + game.characters.map(i => String(i).toUpperCase()).join('') + '`');
    } else if (args[0] === "easy") {
        if (GAMES[msg.author.id] && Date.now() - GAMES[msg.author.id].start < 60000) return msg.reply("Chill... (game not deleted)");
        let word = WORDS_COMMON[Math.floor(WORDS_COMMON.length * Math.random())];
        let game = GAMES[msg.author.id] = {
            characters: shuffleArray(word.split('')),
            word: word,
            // easy: true,
            start: Date.now()
        };
        msg.reply('**EASY MODE** Your characters are `' + game.characters.map(i => String(i).toUpperCase()).join('') + '`');
    } else if (!isNaN(args[0])) {
        if (GAMES[msg.author.id] && Date.now() - GAMES[msg.author.id].start < 60000) return msg.reply("Chill... (game not deleted)");
        let length = parseInt(args[0]);
        let bigger = args[0].startsWith('+');
        if (length < 1 || length > 99) return msg.reply("Only 1-99 allowed!");
        let words;
        if (bigger) words = WORDS.filter(w => w.length >= length);
        else words = WORDS.filter(w => w.length === length);
        if (words.length === 0) return msg.reply("No words found for you!");

        let word = words[Math.floor(words.length * Math.random())];
        let game = GAMES[msg.author.id] = {
            characters: shuffleArray(word.split('')),
            word: word,
            start: Date.now()
        };
        msg.reply('Your characters are `' + game.characters.map(i => String(i).toUpperCase()).join('') + '`');
    } else if (['giveup', 'impos', 'imposs', 'impossible'].includes(args[0])) {
        if (!GAMES[msg.author.id]) return msg.reply("You are not playing");
        let game = GAMES[msg.author.id];
        msg.reply('The original word was **' + game.word + '**! Try harder next time!');
        delete GAMES[msg.author.id];
    } else if (['solve', 'whatis'].includes(args[0])) {
        if (GAMES[msg.author.id]) return msg.reply("You playing a game, **XXXXX**");
        args.shift();
        let minL = 1;
        let easy = false;
        if (args[0] === "easy") {
            args.shift();
            easy = true;
        }
        let showAll = false;
        if (args[0] === "all") {
            args.shift();
            showAll = true;
        }
        if (!isNaN(args[0])) minL = parseInt(args.shift());
        let input = args.join('').toLowerCase().split('');
        minL = Math.min(input.length, minL);
        let targetWord = WORDS.filter(w => easy ? w.length >= minL : w.length === input.length)[showAll ? 'filter' : 'find'](word => arraySubset(input, word.split('')));
        if (showAll) return msg.reply(`Found ${targetWord.length} words\n\`\`\`\n${targetWord.join(', ')}\n\`\`\``);
        else return msg.reply(`Possible solution would be \`${targetWord}\``);
    }
}

exports.directControl = function (msg) {
    let game = GAMES[msg.author.id];
    if (!game) return false;
    if (/^[^a-zA-Z]/.test(msg.content)) return false;
    let isCorrect =
        // game.easy ? arraySubset(game.characters, msg.content.toLowerCase().split('')) :
        arrayEqual(game.characters, msg.content.toLowerCase().split(''));
    let millis = Date.now() - game.start;
    if (isCorrect) {
        msg.reply(`You are **correct**! Time used = \`${Math.floor(millis / 10) / 100}s\``);
        delete GAMES[msg.author.id];
    }
    return true;
}

function arraySubset(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    return b.every(val => a.includes(val) && b.filter(el => el === val).length <= a.filter(el => el === val).length);
}

function arrayEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;
    return b.every(val => a.includes(val) && b.filter(el => el === val).length === a.filter(el => el === val).length);
}

function shuffleArray(array) {
    let currentIndex = array.length, temporaryValue, randomIndex;
    while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}