const request = require("request");
const parse = require('node-html-parser').parse;
const JAR = request.jar();
JAR.setCookie(request.cookie(''), "https://nushigh.coursemology.org");
let USER_CACHE = {};
request({
    url: `https://nushigh.coursemology.org/courses/1706/users`,
    jar: JAR
}, function(error, response, body) {
    if (error || response.statusCode == 404) {
        channel.send("Coursemology Query Failed!");
    } else {
        console.log("Parsing User List...");
        let contents = parse(body).querySelector(".course-users");
        if (!contents) return channel.send(`Query has failed as ${query_base_url}/courses/${encodeURIComponent(course)}/leaderboard is not valid!`);
        let users = contents.querySelectorAll(".course_user");
        console.log("Title = " + contents.firstChild.firstChild.firstChild.text);
        users.forEach(user => {
            USER_CACHE[user.id.substring(12)] = {
                name: user.querySelector(".user-name").text,
                icon: user.querySelector(".profile-picture img").attributes.src
            };
        });
    }
});
