const Discord = require('discord.js');
const config = require('./config.js').config;

const GAMES = {};
const CORDS_REGEX = /^c?[ ,]?([\d]+)[ ,]([\d]+)$/;
const filter = (reaction, user) => ['⚫', '⚪'].includes(reaction.emoji.name) && user.id !== config.id;

exports.directControl = function(msg) {
    let game = GAMES[msg.channel.id]
    if (game) {
        if (CORDS_REGEX.test(msg.content)) {
            try {
                let match = CORDS_REGEX.exec(msg.content);
                let x = parseInt(match[1]) - 1;
                let y = parseInt(match[2]) - 1;
                game.play(x, y, msg.author.id);
                sendLongMessage(msg.channel, game.toString(), game.boardMessages).then(messages => game.boardMessages = messages);
                if (game.checkWinStatus()) {
                    msg.channel.send("<@" + game.players[game.winner] + "> has won the game!");
                    delete GAMES[msg.channel.id];
                }
                msg.delete();
                return true;
            } catch (err) {
                return false;
            }
        }
    }
    return false;
}

exports.handleCommand = function(args, msg, PREFIX) {
    console.log("running gomoku sub-system...");
    if (args.length < 1) return msg.channel.send("Correct Usage: `" + PREFIX + "gomoku start [size] [win length]`");
    switch (args.shift()) {
        case "start":
        case "s":
            if (GAMES.hasOwnProperty(msg.channel.id)) return msg.reply("There is a game in already in progress, join with `" + PREFIX + "gomoku join`");
            try {
                let game = new Gomoku(msg.channel.id, args[0], args[1]);
                GAMES[msg.channel.id] = game;
                msg.channel.send("A game has started!\nJoin with `" + PREFIX + "gomoku join [black|white]` or react to this message!")
                    .then(message => {
                        message.react('⚫').then(r => message.react('⚪'));
                        message.createReactionCollector(filter).on('collect', r => {
                            if (!r) return;
                            console.log(r.emoji.id);
                            let user = r.users.filter(u => u.id !== config.id).first();
                            let side = r.emoji.name === "⚫" ? "black" : "white";
                            console.log(user.tag + " has joined the game as " + side);
                            join(msg, side, () => r.removeAll());
                        });
                    });
                msg.delete();
            } catch (err) {
                msg.reply("Start by using `" + PREFIX + "gomoku start [size] [win length]`");
            }
            break;
        case "join":
        case "j":
            if (GAMES.hasOwnProperty(msg.channel.id)) join(msg, args[0], () => msg.delete());
            else msg.reply("There are no games yet, start with `" + PREFIX + "gomoku start`");
            break;
        case "leave":
        case "l":
            if (GAMES.hasOwnProperty(msg.channel.id)) {
                try {
                    let game = GAMES[msg.channel.id];
                    game.leave(msg.author.id);
                    msg.channel.send("<@" + msg.author.id + "> has left the game!");
                    if (!(game.players.white || game.players.black)) {
                        msg.channel.send("The game have been abandoned!");
                        delete GAMES[msg.channel.id];
                    }
                } catch (err) {
                    console.log(err);
                    msg.reply(err);
                }
            } else msg.reply("There are no games yet, start with `" + PREFIX + "gomoku start`");
            break;
        case "play":
        case "p":
            if (GAMES.hasOwnProperty(msg.channel.id)) try {
                let game = GAMES[msg.channel.id];
                game.play(args[0], args[1], msg.author.id);
                sendLongMessage(msg.channel, game.toString(), game.boardMessages).then(messages => game.boardMessages = messages);
                if (game.checkWinStatus()) msg.channel.send("<@" + game.players[game.winner] + "> has won the game!");
                msg.delete();
            } catch (err) {
                console.log(err);
                msg.reply(err);
            } else msg.reply("There are no games yet, start with `" + PREFIX + "gomoku start`");
            break;
        case "restart":
            if (GAMES.hasOwnProperty(msg.channel.id)) try {
                let game = GAMES[msg.channel.id];
                game.restart(msg.author.id);
                msg.channel.send("Game has restarted");
            } catch (err) {
                msg.reply(err);
            } else msg.reply("There are no games yet, start with `" + PREFIX + "gomoku start`");
            break;
        case "undo":
            if (GAMES.hasOwnProperty(msg.channel.id)) try {
                let game = GAMES[msg.channel.id];
                msg.channel.send(game.undo(msg.author.id));
            } catch (err) {
                msg.reply(err);
            } else msg.reply("There are no games yet, start with `" + PREFIX + "gomoku start`");
            break;
    }
}

function join(msg, side, success) {
    try {
        if (side === "b") side = "black";
        if (side === "w") side = "white";
        let game = GAMES[msg.channel.id];
        game.join(msg.author.id, side);
        msg.channel.send("<@" + msg.author.id + "> has joined the game as " + side + "!");
        if (game.hasStarted()) {
            msg.channel.send("> **The game has started!**\nPlaying as black: <@" + game.players.black + ">\nPlaying as white: <@" + game.players.white + ">");
            sendLongMessage(msg.channel, game.toString(), game.boardMessages).then(messages => game.boardMessages = messages);
        }
        success();
    } catch (err) {
        console.log(err);
        msg.reply(err);
    }
}

class Gomoku {
    constructor(id, size, winLength) {
        if (size && typeof(size) === "string") size = parseInt(size);
        size = Math.min(Math.max(size, 3), 19);
        if (winLength && typeof(winLength) === "string") winLength = parseInt(winLength);
        winLength = Math.min(Math.max(winLength, 3), size);
        this.id = id;
        this.size = size || 10;
        this.gameBoard = generateArray(this.size);
        this.history = [];
        this.reqUndo = {
            black: false,
            white: false
        };
        this.reqRestart = {
            black: false,
            white: false
        };
        this.players = {
            black: null,
            white: null
        };
        this.toPlay = "black";
        this.winLength = winLength || 5;
        this.winner = null;
        console.log("Gomoku Init | ID = " + this.id + ", Size = " + size);
    }

    join(player, side) {
        if (this.players.black && this.players.white) throw "Game already have two players";
        if (side !== "black" && side !== "white") throw "You can only join as black/white";
        if (this.players[side]) throw "<@" + this.players[side] + "> has already taken " + side;
        this.players[side] = player;
        console.log("Player " + player + " has joined " + this.id);
    }

    leave(player) {
        if (player !== this.players.black && player !== this.players.white) throw "You are not playing!";
        if (player === this.players.black) this.players.black = null;
        if (player === this.players.white) this.players.white = null;
        this.winner = null;
        console.log("Player " + player + " has left " + this.id);
    }

    checkPlayer(player) {
        if (!(this.players.black && this.players.white)) throw "2 players required to start!";
        if (player !== this.players.black && player !== this.players.white) throw "You are not in the game";
    }

    play(x, y, player) {
        if (this.winner) throw "Game has already ended!";
        if (isNaN(x) || isNaN(y)) throw "X or Y are not integers!";
        this.checkPlayer(player);
        if (this.players[this.toPlay] !== player) throw "Not your turn!";
        x = parseInt(x);
        y = parseInt(y);
        if (x >= this.size || y >= this.size || x < 0 || y < 0) throw "The board is " + this.size + "×" + this.size;
        if (this.gameBoard[y][x] !== " ") throw "There is already a piece at " + x + ", " + y;
        this.gameBoard[y][x] = this.toPlay === "black" ? 'x' : 'o';
        this.toPlay = this.toPlay === "black" ? "white" : "black";
        this.history.push({
            x: x,
            y: y,
            side: player === this.players.black ? "black" : "white"
        });
        this.reqUndo.black = this.reqUndo.white = false;
        this.reqRestart.black = this.reqRestart.white = false;
    }

    hasStarted() {
        return this.players.black && this.players.white;
    }

    undo(player) {
        this.checkPlayer(player);
        if (this.history.length === 0) throw "There are no moves to undo!";
        let side = (player === this.players.black ? "black" : "white");
        this.reqUndo[side] = true;
        if (this.reqUndo.black && this.reqUndo.white) {
            this.reqUndo.black = this.reqUndo.white = false;
            this.winner = null;
            let move = this.history.pop();
            this.toPlay = move.side;
            this.gameBoard[y, x] = null;
            return move.side + "'s move at x: " + move.x + ", y: " + move.y + " has been undone";
        } else throw "<@" + (player === this.players.black ? this.players.white : this.players.black) + "> Please confirm with `!gomoku undo`";
    }

    checkWinStatus() {
        let winner = this.checkWinHorizontal(this.gameBoard) || this.checkWinVertical(this.gameBoard);
        if (winner) return this.winner = winner;

        let shiftLeft = [];
        for (let y = 0; y < this.size; y++) shiftLeft[y] = this.gameBoard[y].slice(y);
        winner = this.checkWinVertical(shiftLeft);
        if (winner) return this.winner = winner;

        let shiftRight = [];
        for (let y = 0; y < this.size; y++) shiftRight[y] = this.gameBoard[y].slice(this.size - 1 - y);
        winner = this.checkWinVertical(shiftRight);
        return this.winner = winner;
    }

    checkWinHorizontal(board) {
        let blackwin = new RegExp(`x{${this.winLength},${this.winLength}}`, "g");
        let whitewin = new RegExp(`o{${this.winLength},${this.winLength}}`, "g");
        for (let y = 0; y < this.size; y++) {
            let line = board[y].map(c => c || " ").join("");
            if (blackwin.test(line)) return "black";
            if (whitewin.test(line)) return "white";
        }
        return null;
    }

    checkWinVertical(board) {
        let blackwin = new RegExp(`x{${this.winLength},${this.winLength}}`, "g");
        let whitewin = new RegExp(`o{${this.winLength},${this.winLength}}`, "g");
        for (let x = 0; x < this.size; x++) {
            let line = board.map(row => row[x] || " ").join("");
            if (blackwin.test(line)) return "black";
            if (whitewin.test(line)) return "white";
        }
        return null;
    }

    reset(player) {
        this.checkPlayer(player);
        let side = (player === this.players.black ? "black" : "white");
        this.reqRestart[side] = true;
        if (this.reqRestart.black && this.reqRestart.white) {
            this.reqRestart.black = this.reqRestart.white = false;
            this.winner = undefined;
            this.history = [];
            this.toPlay = "black";
            this.gameBoard = generateArray(this.size);
        } else throw "<@" + (player === this.players.black ? this.players.white : this.players.black) + "> Please confirm with `!gomoku restart`";
    }

    toString() {
        return genColLabels(this.size) + "\n" +
            this.gameBoard.map((row, y) => ":" + numbersToEng[(y + 1) % 10] + ":" + row.map(cell => pieceToEmote[cell]).join("")).join("\n") + "\nMay the winner have good luck!";
    }
}
const numbersToEng = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const pieceToEmote = {
    "x": "<:pb:730333382797557782>",
    "o": "<:pw:730333382981976104>",
    " ": "<:gd:730327232735608843>"
};

function genColLabels(width) {
    let str = ":zero:";
    for (let i = 0; i < width; i++) {
        str += ":" + numbersToEng[(i + 1) % 10] + ":";
    }
    return str;
}


function generateArray(size) {
    let array = [];
    for (let i = 0; i < size; i++) {
        array[i] = [];
        for (let j = 0; j < size; j++) {
            array[i][j] = " ";
        }
    }
    return array;
}

async function sendLongMessage(channel, msg, objects) {
    objects = objects || [];
    let messages = [];
    let buffer = [];
    let size = 0;
    msg.split("\n").forEach(line => {
        if (size + line.length >= 2000) {
            size = 0;
            messages.push(buffer.join("\n"));
            buffer = [];
        }
        buffer.push(line);
        size += line.length + 1;
    })
    messages.push(buffer.join("\n"));
    for (let i = 0; i < messages.length; i++) {
        if (messages[i].length > 2000) console.log("Died\n" + messages[i]);
        if (objects[i]) {
            if (objects[i].content !== messages[i]) await objects[i].edit(messages[i]);
        } else objects.push(await channel.send(messages[i]));
    }
    if (objects.length > messages.length) {
        objects.splice(messages.length).forEach(m => m.delete());
    }
    return objects;
}
