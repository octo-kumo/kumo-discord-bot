const parse = require('node-html-parser').parse;
let html = '<div class="condition_assessment" id="condition_assessment_21610"><a href="/courses/1389/achievements/8106">OCD</a> (Score at least 60% for Lab 0: Setting up Java)</div>';
let object = parse(html);
console.log(object.childNodes);
