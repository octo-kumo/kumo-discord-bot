const {
    Schema, model
} = require('mongoose');
const findOrCreate = require('mongoose-findorcreate');

const User = new Schema({
    id: {
        type: String,
        unique: true,
        required: true
    },
    credit: {
        type: Number,
        required: true,
        default: 0
    },
    appeared_in: {
        type: Array,
        required: true,
        default: () => []
    },
    game24_history: {
        type: Array,
        default: () => []
    },
    game24_average: {
        type: Number
    }
});
User.plugin(findOrCreate);
module.exports = model('kumo_bot_user', User);