const Discord = require('discord.js');
const config = require('./config.js').config;

const GAMES = {};
const filter = (reaction, user) => ['⚫', '⚪'].includes(reaction.emoji.name) && user.id !== config.id;

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
                if (!game.boardMessage)
                    msg.channel.send(game.toString()).then(message => game.boardMessage = message);
                else game.boardMessage.edit(game.toString());

                if (game.checkWinStatus()) {
                    msg.channel.send("<@" + game.players[game.winner] + "> has won the game!");
                }
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
            msg.channel.send(game.toString()).then(message => game.boardMessage = message);
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
        if (winLength && typeof(winLength) === "string") winLength = parseInt(winLength);
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
        if (this.gameBoard[y][x]) throw "There is already a piece at " + x + ", " + y;
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
        let heading = [];
        for (let j = 0; j < this.size; j++) {
            heading.push(j.toString().padEnd(2, "_"));
        }
        let str = [];
        str.push("  |" + heading.join("_") + "|");
        for (let i = 0; i < this.size; i++) {
            let line = [];
            for (let j = 0; j < this.size; j++) {
                line.push((this.gameBoard[i][j] || "").padEnd(2, "_"));
            }
            str.push(i.toString().padEnd(2, " ") + "|" + line.join("|") + "|");
        }
        return "```\n" + str.join("\n") + "\n```";
    }
}

function generateArray(size) {
    let array = [];
    for (let i = 0; i < size; i++) {
        array[i] = [];
        for (let j = 0; j < size; j++) {
            array[i][j] = null;
        }
    }
    return array;
}
