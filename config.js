exports.config = {
    list_presets: {
        "1811": {
            name: "CS4131 Mobile Application Development AY2020",
            labs: {
                cat: 2067,
                tab: 3425
            },
            assignments: {
                cat: 2068,
                tab: 3426
            },
            projects: {
                cat: 2069,
                tab: 3427
            }
        },
        "1706": {
            name: "CS3233 Object Oriented Programming II AY2019",
            labs: {
                cat: 1880,
                tab: 3080
            },
            reviews: {
                cat: 1880,
                tab: 3081
            }
        },
        "1389": {
            name: "CS3231 Object Oriented Programming I AY2019",
            labs: {
                cat: 1662,
                tab: 2638
            },
            reviews: {
                cat: 1662,
                tab: 2706
            }
        },
        "1613": {
            name: "CS1131 Computational Thinking AY2017",
            labs: {
                cat: 145,
                tab: 217
            },
            reviews: {
                cat: 145,
                tab: 218
            }
        }
    },
    query_base_url: "https://nushigh.coursemology.org",
    debug: process.env.LOCAL === true,
    leaderboard: {},
    leaderboard_feed_channel: null,
    id: "",
    PRESENCE: {
        game: {
            name: 'with the clouds. !help'
        },
        status: 'idle'
    },
    HOOK: null,
    USERS_CACHE: {},
    DEFAULT_COURSE: "1811",
    NUMBER_OF_USER_PER_PAGE: 8,
    COURSES: [1811, 1706, 1389, 614, 1613],
    COURSE_NAMES: ["CS4131 Mobile Application Development AY2020", "CS3233 Object Oriented Programming II AY2019", "CS3231 Object Oriented Programming I AY2019", "CS2231 Introduction to Programming AY2018S1", "CS1131 Computational Thinking AY2017"],
    SLEEP_IMAGES: [
        "https://res.cloudinary.com/chatboxzy/image/upload/v1573747146/sleep_1.jpg",
        "https://res.cloudinary.com/chatboxzy/image/upload/v1573747147/sleep_2.jpg",
        "https://res.cloudinary.com/chatboxzy/image/upload/v1573747147/sleep_3.jpg",
        "https://res.cloudinary.com/chatboxzy/image/upload/v1573747147/sleep_4.jpg",
        "https://res.cloudinary.com/chatboxzy/image/upload/v1573975487/sleep_5.jpg",
        "https://res.cloudinary.com/chatboxzy/image/upload/v1573975487/sleep_6.jpg",
        "https://res.cloudinary.com/chatboxzy/image/upload/v1573975487/sleep_7.jpg",
        "https://res.cloudinary.com/chatboxzy/image/upload/v1573975640/sleep_8.jpg",
        "https://res.cloudinary.com/chatboxzy/image/upload/v1573976437/sleep_9.jpg"
    ],
    SLEEP_MESSAGES: [{
        title: "It is late",
        body: "It is so late in the night.\nIn fact if you sleep now, you will wake up feeling less miserable ${username}."
    }, {
        title: "**Ernest Hemingway** once said",
        body: "_I love sleep. My life has the tendency to fall apart when I'm awake, you know._\nDon't you agree, ${username}?"
    }, {
        title: "Just ***Sleep***",
        body: "When you go to sleep, you die. And the next morning, when you wake up, you are reborn!\nJust go and kill yourself ${username}"
    }, {
        title: "Sleep = Isekai?",
        body: "SLEEP NOW YOU WEEB"
    }, {
        title: "Wanna hear a joke?",
        body: "**Sleep**\n**${username}**: wat\nLol, in fact, I dont get it either."
    }, {
        title: "Sleeping is ***easy***",
        body: "Sleeping is so easy an average man can do it with his **eyes closed**."
    }, {
        title: "Are you impatient?",
        body: "You are not even sleeping, and yet you already can't wait for tomorrow.\nGuess the world is not fair making ${username}'s days so great."
    }, {
        title: "Are you sleeping?",
        body: "Nah you are just resting your eyes. I know you are, ${username}."
    }, {
        title: "Don't give up on your dreams!",
        body: "Go on and sleep!\nDon't you have dreams, ${username}?"
    }],
    SLEEP_LATE: ["https://res.cloudinary.com/chatboxzy/image/upload/v1573747132/sleep_late.jpg"],
    SIMPLE_REPLIES: {
        'oof': 'Indeed',
        'idk': 'me neither',
        '😉': ';)',
        'lol': ':P',
        'wip': ';)',
        'bio': 'you are bio',
        'nice': ':clap: yes very nice!',
        'wat': 'wat',
        'what': 'wat',
        'cloudy': 'Yes it is. Great isn\'t it?',
        'hrm': 'Hum?',
        'wtf': '_Theres nothing you can do~_ Or perhaps there is. IDK',
        'bruh': 'Yes? ( ͡° ͜ʖ ͡°)',
        'kumo': 'Hi'
    },
    CONTAINS_REPLIES: {
        '<@!456001047756800000>': 'I will notify my human self',
        '<@!643028637112860682>': 'I will notif- wait, you are calling me, what is it?'
    }
}
