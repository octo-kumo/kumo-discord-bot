const solver = require('./solver24.js');
const GAMES = [];
exports.handleCommand = function (args, msg, PREFIX) {
    if (args.length === 0) {
        let game = GAMES[msg.author.id] = {
            digits: [0, 1, 2, 3].map(i => Math.floor(Math.random() * 9) + 1),
            start: Date.now()
        };
        msg.reply('Your numbers are `' + game.digits.map(i => String(i)).join(" ") + '`');
    } else if (['impos', 'imposs', 'impossible'].includes(args[0])) {
        let solution = solver.solve24Array(GAMES[msg.author.id].digits);
        if (!solution) msg.reply('It is **impossible**!');
        else msg.reply('Sorry but one **possible** solution is `' + solution + '`');
        delete GAMES[msg.author.id];
    }
}
const ANSWER_REGEX = /^[()+\-*/\s]*\d[()+\-*/\s]+\d[()+\-*/\s]+\d[()+\-*/\s]+\d[()+\-*/\s]*$/;
exports.directControl = function (msg) {
    let game = GAMES[msg.author.id];
    if (!game) return false;
    if (!ANSWER_REGEX.test(msg.content)) return;
    if (eval(msg.content) === 24) {
        msg.reply('You are **correct**!');
        delete GAMES[msg.author.id];
    } else {
        let solution = solver.solve24Array(game.digits);
        msg.reply('Sorry but you are **wrong**! One possible answer would be `' + solution + '`');
        delete GAMES[msg.author.id];
    }
    return true;
}
