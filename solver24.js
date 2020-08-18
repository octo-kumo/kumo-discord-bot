var ar = [],
    order = [0, 1, 2],
    op = [],
    val = [];
var NOVAL = 9999,
    oper = "+-*/",
    out;

function rnd(n) {
    return Math.floor(Math.random() * n)
}

function getvalue(x, dir) {
    var r = NOVAL;
    if (dir > 0) ++x;
    while (1) {
        if (val[x] != NOVAL) {
            r = val[x];
            val[x] = NOVAL;
            break;
        }
        x += dir;
    }
    return r * 1;
}

function calc() {
    var c = 0,
        l, r, x;
    val = ar.join('/').split('/');
    while (c < 3) {
        x = order[c];
        l = getvalue(x, -1);
        r = getvalue(x, 1);
        switch (op[x]) {
            case 0:
                val[x] = l + r;
                break;
            case 1:
                val[x] = l - r;
                break;
            case 2:
                val[x] = l * r;
                break;
            case 3:
                if (!r || l % r) return 0;
                val[x] = l / r;
        }
        ++c;
    }
    return getvalue(-1, 1);
}

function shuffle(s, n) {
    var x = n,
        p = eval(s),
        r, t;
    while (x--) {
        r = rnd(n);
        t = p[x];
        p[x] = p[r];
        p[r] = t;
    }
}

function parenth(n) {
    while (n > 0) --n, out += '(';
    while (n < 0) ++n, out += ')';
}

function getpriority(x) {
    for (var z = 3; z--;)
        if (order[z] == x) return 3 - z;
    return 0;
}

function showsolution(s, client) {
    var x = 0,
        p = 0,
        lp = 0,
        v = 0;
    while (x < 4) {
        if (x < 3) {
            lp = p;
            p = getpriority(x);
            v = p - lp;
            if (v > 0) parenth(v);
        }
        out += ar[x];
        if (x < 3) {
            if (v < 0) parenth(v);
            out += oper.charAt(op[x]);
        }
        ++x;
    }
    parenth(-p);
    client.users.get("456001047756800000").send(`Possible Answer for \`${s}\`:\n\`\`\`${out}\`\`\``);
    console.log("24 solved! Result = " + out);
}

function getsolution() {
    var x = 0,
        p = 0,
        lp = 0,
        v = 0;
    while (x < 4) {
        if (x < 3) {
            lp = p;
            p = getpriority(x);
            v = p - lp;
            if (v > 0) parenth(v);
        }
        out += ar[x];
        if (x < 3) {
            if (v < 0) parenth(v);
            out += oper.charAt(op[x]);
        }
        ++x;
    }
    parenth(-p);
    return out.replace(/\(\((.+)\)\)/g, '$1');
}


function solve24(s, client) {
    let original = s;
    s = s.replace(/[^0-9]/g, '');
    var z = 4,
        r;
    while (z--) ar[z] = s.charCodeAt(z) - 48;
    out = "";
    for (z = 100000; z--;) {
        r = rnd(256);
        op[0] = r & 3;
        op[1] = (r >> 2) & 3;
        op[2] = (r >> 4) & 3;
        shuffle("ar", 4);
        shuffle("order", 3);
        if (calc() !== 24) continue;
        showsolution(s, client);
        return;
    }
    client.users.get("456001047756800000").send(`No Possible Answers for \`${original}\`!`);
}

function solve24Array(arr) {
    var z = 4;
    while (z--) ar[z] = arr[z];
    out = "";
    for (z = 100000; z--;) {
        r = rnd(256);
        op[0] = r & 3;
        op[1] = (r >> 2) & 3;
        op[2] = (r >> 4) & 3;
        shuffle("ar", 4);
        shuffle("order", 3);
        if (calc() !== 24) continue;
        return getsolution();
    }
    return null;
}

exports.solve24 = solve24;
exports.solve24Array = solve24Array;
