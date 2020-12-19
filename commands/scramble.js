const WORDS = require('fs').readFileSync(require('path').join(__dirname, '..', 'json', 'words_csw.txt'), 'utf8').toLowerCase().split('\n');
const WORDS_COMMON = require('fs').readFileSync(require('path').join(__dirname, '..', 'json', 'words_10k.txt'), 'utf8').toLowerCase().split('\n');
const WORDS_NORMAL = WORDS.filter(w => w.length > 1);
const GAMES = {};

exports.handleCommand = function (args, msg, PREFIX) {
    let easy = args.includes("easy");
    if (easy) args.splice(args.indexOf('easy'), 1);
    let limit = args.find(arg => !isNaN(arg));
    if (limit) {
        limit = Math.min(30, Math.max(1, parseInt(limit)));
        args.splice(args.findIndex(arg => !isNaN(arg)), 1);
    } else limit = -1;

    if (args.length === 0) {
        if (GAMES[msg.author.id] && Date.now() - GAMES[msg.author.id].start < 60000) return msg.reply("Chill... (game not deleted)");
        let list = easy ? WORDS_COMMON : WORDS_NORMAL;
        if (limit !== -1) list = list.filter(elem => elem.length === limit);
        if (list.length === 0) return msg.reply("No words found for you!");
        let word = list[Math.floor(list.length * Math.random())];
        let game = GAMES[msg.author.id] = {
            characters: (easy ? easyShuffle : shuffleArray)(word.split('')),
            word: word,
            start: Date.now()
        };
        msg.reply(`${easy ? "**EASY MODE** " : ''}Your characters are \`${game.characters.map(i => String(i).toUpperCase()).join('')}\``);
    } else if (['giveup', 'impos', 'imposs', 'impossible'].includes(args[0])) {
        if (!GAMES[msg.author.id]) return msg.reply("You are not playing");
        let game = GAMES[msg.author.id];
        msg.reply('The original word was **' + game.word + '**! Try harder next time!');
        delete GAMES[msg.author.id];
    } else if (['solve', 'whatis'].includes(args[0])) {
        if (GAMES[msg.author.id]) return msg.reply("You playing a game, **XXXXX**");
        args.shift();
        let minL = 1;
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
        arrayEqual(game.characters, msg.content.toLowerCase().split(''))
        && (WORDS.includes(msg.content.toLowerCase()) || WORDS_COMMON.includes(msg.content.toLowerCase()))
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

function easyShuffle(array) {
    let operations = Math.random() * (array.length / 4) + 2;
    for (let i = 0; i < operations; i++) {
        let a = Math.floor(Math.random() * (array.length - 1));
        let b = Math.floor(Math.random() * (array.length - 1));
        if (b >= a) b += 1;
        [array[a], array[b]] = [array[b], array[a]];
    }
    return array;
}