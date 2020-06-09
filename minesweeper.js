const EMOTES = ["<:ms0:719891662956134524>", "<:ms1:719889884168454235>", "<:ms2:719889884180906075>", "<:ms3:719889884361523222>", "<:ms4:719889884172517446>", "<:ms5:719889884201877616>", "<:ms6:719889884415787008>", "<:ms7:719889884424437770>", "<:ms8:719889883832778803>"];
const MINE = "<:mx:719905144652693576>";
const Cell = (x, y, board, mine) => {
    let cell = {
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
            return `||${cell.mine ? MINE : EMOTES[sum]}||`;
        }
    };
    return cell;
}
const Board = (width, height, msg) => {
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
    return `__***Minesweeper ${width}×${height}***__\n` +
        cells.map(row => row.map(cell => cell.init()).join("")).join("\n") +
        "\nDo your best! " + msg.author.username;
}
exports.handleCommand = function(args, msg, PREFIX) {
    return Board(args[0], args[1] || args[0], msg);
}
