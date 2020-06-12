const EMOTES = ["<:ms0:719891662956134524>", "<:ms1:719889884168454235>", "<:ms2:719889884180906075>", "<:ms3:719889884361523222>", "<:ms4:719889884172517446>", "<:ms5:719889884201877616>", "<:ms6:719889884415787008>", "<:ms7:719889884424437770>", "<:ms8:719889883832778803>"];
const MINE = "<:mx:719905144652693576>";
const Cell = (x, y, board, mine) => {
    return {
        x: x,
        y: y,
        sum: 0,
        opened: false,
        mine: mine,
        init: function() {
            let neighbours = [];
            if (y > 0) neighbours.push(board[y - 1][x]);
            if (y < board.length - 1) neighbours.push(board[y + 1][x]);
            if (x > 0) {
                neighbours.push(board[y][x - 1]);
                if (y > 0) neighbours.push(board[y - 1][x - 1]);
                if (y < board.length - 1) neighbours.push(board[y + 1][x - 1]);
            }
            if (x < board[0].length - 1) {
                neighbours.push(board[y][x + 1]);
                if (y > 0) neighbours.push(board[y - 1][x + 1]);
                if (y < board.length - 1) neighbours.push(board[y + 1][x + 1]);
            }
            this.sum = neighbours.filter(c => c.mine).length;
        },
        display: function() {
            return (this.opened ? '' : '||') +
                (this.mine ? MINE : EMOTES[this.sum]) +
                (this.opened ? '' : '||');
        }
    };
}
const Board = (width, height) => {
    width = Math.min(32, Math.max(4, width && !isNaN(width) ? parseInt(width) : 8));
    height = Math.min(32, Math.max(4, height && !isNaN(height) ? parseInt(height) : 8));
    let cells = [];
    for (let y = 0; y < height; y++) {
        cells[y] = [];
        for (let x = 0; x < width; x++)
            cells[y][x] = Cell(x, y, cells, false);
    }
    const numOfMines = Math.floor(width * height * 0.15);
    for (let i = 0; i < numOfMines;) {
        let x = Math.floor(Math.random() * width);
        let y = Math.floor(Math.random() * height);
        if (cells[y][x].mine) continue;
        cells[y][x].mine = true;
        i++;
    }
    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) cells[y][x].init();
    return {
        width: width,
        height: height,
        numOfMines: numOfMines,
        cells: cells,
        click: function(x, y, recursive) {
            if (x >= 0 && x < width && y >= 0 && y < height && !this.cells[y][x].opened) {
                this.cells[y][x].opened = true;
                if (this.cells[y][x].sum != 0) return;
                this.click(x + 1, y, true);
                this.click(x - 1, y, true);
                this.click(x, y - 1, true);
                this.click(x, y + 1, true);
                this.click(x + 1, y + 1, true);
                this.click(x - 1, y - 1, true);
                this.click(x + 1, y - 1, true);
                this.click(x - 1, y + 1, true);
            } else {
                return;
            }
        }
    };
}
const Game = (owner, width, height, msg) => {
    return {
        owner: owner,
        board: Board(width, height),
        listening: true,
        messages: [],
        click: function(x, y) {
            this.board.click(x, y);
            return this.refreshDisplay();
        },
        refreshDisplay: function() {
            return sendLongMessage(msg.channel, render(this.board, msg.author.username), this.messages);
        },
        clearDisplay: function() {
            while (this.messages.length > 0) this.messages.pop().delete();
        }
    };
}
const GAMES = {};
const CORDS_REGEX = /^([\d]+)[ ,]([\d]+)$/;
exports.handleCommand = function(args, msg, PREFIX) {
    let game = GAMES[msg.author.id];
    let command = args.shift()
    switch (command) {
        case "stop":
        case "s":
            if (!game) return msg.reply("You are not in the mine field");
            game.clearDisplay();
            delete GAMES[msg.author.id];
            break;
        case "refresh":
        case "r":
            if (!game) return msg.reply("You are not in the mine field");
            game.clearDisplay();
            game.refreshDisplay();
            break;
        case "toggle":
        case "t":
            if (!game) return msg.reply("You are not in the mine field");
            game.listening = !game.listening;
            msg.reply("Detector for \"x y\" is **" + (game.listening ? "ON" : "OFF") + "**")
            break;
        case "start":
        case "s":
            GAMES[msg.author.id] = game = startGame(args[0], args[1] || args[0], msg);
            game.refreshDisplay();
            break;
        default:
            GAMES[msg.author.id] = game = startGame(command, args[0] || command, msg);
            game.refreshDisplay();
            break;
    }
    if (game) game.lastCommand = msg;
}
exports.directControl = function(msg) {
    if (GAMES[msg.author.id] && GAMES[msg.author.id].listening && CORDS_REGEX.test(msg.content)) {
        let match = CORDS_REGEX.exec(msg.content);
        let x = parseInt(match[1]) - 1;
        let y = parseInt(match[2]) - 1;
        GAMES[msg.author.id].click(x, y);
        msg.delete();
        return true;
    } else return false;
}

function startGame(width, height, msg) {
    return Game(msg.author.id, width, height, msg);
}

function render(board, username) {
    return `__**Minesweeper ${board.width}×${board.height}**__ (${board.numOfMines} mines)\n` +
        board.cells.map(row => row.map(cell => cell.display()).join("")).join("\n") +
        "\nGambatte " + username + "!";
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
        if (objects[i]) await objects[i].edit(messages[i]);
        else objects.push(await channel.send(messages[i]));
    }
    if (objects.length > messages.length) {
        objects.splice(messages.length).forEach(m => m.delete());
    }
    return objects;
}
