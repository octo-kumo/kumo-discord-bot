const {
    Schema
} = require('mongoose');

const User = new Schema({
    id: {
        type: String,
        unique: true,
        required: true
    },
    credit: {
    }
});
