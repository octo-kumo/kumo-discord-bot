(function (root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        // AMD support.
        define([], factory);
    } else if (typeof exports === 'object') {
        // NodeJS support.
        module.exports = factory();
    } else {
        // Browser global support.
        root.solve24game = factory();
    }
}(this, function () {
    'use strict';
    const Calc = require('expression-calculator');
    var tempRPN = [
        [
            {type: Calc.TOKEN_NUM},
            {type: Calc.TOKEN_NUM},
            {type: Calc.TOKEN_NUM},
            {type: Calc.TOKEN_NUM},
            {type: Calc.TOKEN_OPER},
            {type: Calc.TOKEN_OPER},
            {type: Calc.TOKEN_OPER},
        ],
        [
            {type: Calc.TOKEN_NUM},
            {type: Calc.TOKEN_NUM},
            {type: Calc.TOKEN_NUM},
            {type: Calc.TOKEN_OPER},
            {type: Calc.TOKEN_NUM},
            {type: Calc.TOKEN_OPER},
            {type: Calc.TOKEN_OPER},
        ],
        [
            {type: Calc.TOKEN_NUM},
            {type: Calc.TOKEN_NUM},
            {type: Calc.TOKEN_NUM},
            {type: Calc.TOKEN_OPER},
            {type: Calc.TOKEN_OPER},
            {type: Calc.TOKEN_NUM},
            {type: Calc.TOKEN_OPER},
        ],
        [
            {type: Calc.TOKEN_NUM},
            {type: Calc.TOKEN_NUM},
            {type: Calc.TOKEN_OPER},
            {type: Calc.TOKEN_NUM},
            {type: Calc.TOKEN_NUM},
            {type: Calc.TOKEN_OPER},
            {type: Calc.TOKEN_OPER},
        ],
        [
            {type: Calc.TOKEN_NUM},
            {type: Calc.TOKEN_NUM},
            {type: Calc.TOKEN_OPER},
            {type: Calc.TOKEN_NUM},
            {type: Calc.TOKEN_OPER},
            {type: Calc.TOKEN_NUM},
            {type: Calc.TOKEN_OPER},
        ],
    ];
    var enumTemplates = function (n0, op0, goal, f) {
        for (var i = 0; i < tempRPN.length; i++) {
            var rpn = tempRPN[i], n = n0.slice(0), op = op0.slice(0);
            for (var j = 0; j < rpn.length; j++) {
                switch (rpn[j].type) {
                    case Calc.TOKEN_NUM:
                        rpn[j].value = n.pop();
                        break;
                    case Calc.TOKEN_OPER:
                        rpn[j].value = op.pop();
                        break;
                }
            }
            var calc = new Calc();
            calc.setRPN(rpn);
            if (Math.abs(calc.calc() - goal) < 0.00001) {
                f(calc.getSimplifiedExpr());
            }
        }
    }
    var enumOpers = function (a, b, c, d, goal, f) {
        var op = ['+', '-', '*', '/'], i, j, k;
        for (i = 0; i < op.length; i++) {
            for (j = 0; j < op.length; j++) {
                for (k = 0; k < op.length; k++) {
                    enumTemplates([d, c, b, a], [op[k], op[j], op[i]], goal, f);
                }
            }
        }
    }
    var enumNums = function (n, goal, f) {
        var i, j, k;
        for (i = 0; i < 4; i++) {
            for (j = 0; j < 4; j++) {
                if (j === i) {
                    continue;
                }
                for (k = 0; k < 4; k++) {
                    if (k === i || k === j) {
                        continue;
                    }
                    enumOpers(n[i], n[j], n[k], n[6 - i - j - k], goal, f);
                }
            }
        }
    }
    return function (a, b, c, d, goal) {
        var n = [a, b, c, d], i;
        for (i = 0; i < 4; i++) {
            if (isNaN(n[i]) || n[i] < 1) {
                throw new Error('Number must above 1');
            }
        }
        if (undefined === goal) {
            goal = 24;
        } else if (isNaN(goal) || goal < 0) {
            throw new Error('Goal must at least 0');
        }
        var result = [];
        enumNums(n, goal, function (expr) {
            if (-1 === result.indexOf(expr)) {
                result.push(expr);
            }
        });
        return result;
    }
}));