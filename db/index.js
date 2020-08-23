const mongoose = require('mongoose');
const User = require('./user');

mongoose.connect(process.env.DATABASE, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useFindAndModify: false,
    useCreateIndex: true,
    dbName: 'database',
}).then(() => console.log('Connected to MongoDB')).catch(err => console.log('Mongo DB Caught', err.stack));

module.exports = {
    User: User
};
