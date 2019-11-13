const {
    parse
} = require('node-html-parser');

const root = parse('<ul href="www" id="list"><li href="wdw" class="wd">Hello World</li></ul>');
console.log(root.firstChild.attributes);
