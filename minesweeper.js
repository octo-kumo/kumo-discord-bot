const EMOTES = ["<:ms0:719891662956134524>", "<:ms1:719889884168454235>", "<:ms2:719889884180906075>", "<:ms3:719889884361523222>", "<:ms4:719889884172517446>", "<:ms5:719889884201877616>", "<:ms6:719889884415787008>", "<:ms7:719889884424437770>", "<:ms8:719889883832778803>"];
const MINE = "<a:mine:719886815020056607>";
const Cell = (x, y, board, mine) => {
    return {
        x: x,
        y: y,
        sum: 0,
        mine: mine,
        init: () => {
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
            sum = neighbours.filter(c => c.mine).length;
            return `||${this.mine ? MINE : EMOTES[sum]}||`;
        }
    };
}
const Board = () => {
    let cells = [];
    for (let y = 0; y < 8; y++) {
        cells[y] = [];
        for (let x = 0; x < 8; x++)
            cells[y][x] = Cell(x, y, cells, false);
    }
    for (let i = 0; i < 10;) {
        let x = Math.floor(Math.random() * 8);
        let y = Math.floor(Math.random() * 8);
        if (cells[y][x].mine) continue;
        cells[y][x].mine = true;
        i++;
    }
    return cells.map(row => row.map(cell => cell.init()).join("")).join("\n");
}
exports.handleCommand = function(args, msg, PREFIX) {
    msg.channel.send(Board()).then(msg.channel.send("Do your best! " + msg.author.username));
}
