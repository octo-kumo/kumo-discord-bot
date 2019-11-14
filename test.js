const {
    parse
} = require('node-html-parser');

const root = parse('<ul href="www" id="list" class="wwd wd"><li href="wdw" class="wd">Hello World</li></ul>');
console.log(root.firstChild.attributes.class.includes("wwd"));
