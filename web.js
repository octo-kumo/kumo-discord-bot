const express = require('express')
const app = express()
const SHIPS = require('./ships.json')

app.get('/', function(req, res) {
    res.send('The light is around you, or is it')
});

app.get('/ship', function(req, res) {
    res.send('Only POST requests are allowed')
})

app.post('/ship', function(req, res) {
    if (req.query.id) {
        res.send(getShipByID(req.query.id))
    } else if (req.query.name) {
        res.send(getShipByName(req.query.name))
    } else {
        res.send("ID/Name required");
    }
})

app.get('/ship/id/:ship', function(req, res) {
    if (req.params.ship) {
        res.send(getShipByID(req.params.ship))
    }
})

app.get('/ship/name/:ship', function(req, res) {
    if (req.params.ship) {
        res.send(getShipByName(req.params.ship))
    }
})

app.listen(process.env.PORT || 3000);

function getShipByID(id) {
    for (let ship of Object.values(SHIPS)) {
        if (ship.id === id) return ship;
    }
    return null;
}

function getShipByName(name) {
    for (let ship of Object.values(SHIPS)) {
        if (ship.names.en && ship.names.en.toUpperCase() === name.toUpperCase()) return ship;
        if (ship.names.jp && ship.names.jp.toUpperCase() === name.toUpperCase()) return ship;
        if (ship.names.kr && ship.names.kr.toUpperCase() === name.toUpperCase()) return ship;
        if (ship.names.cn && ship.names.cn.toUpperCase() === name.toUpperCase()) return ship;
        if (ship.names.code && ship.names.code.toUpperCase() === name.toUpperCase()) return ship;
    }
    for (let ship of Object.values(SHIPS)) {
        if (ship.names.en && ship.names.en.toUpperCase().includes(name.toUpperCase())) return ship;
        if (ship.names.jp && ship.names.jp.toUpperCase().includes(name.toUpperCase())) return ship;
        if (ship.names.kr && ship.names.kr.toUpperCase().includes(name.toUpperCase())) return ship;
        if (ship.names.cn && ship.names.cn.toUpperCase().includes(name.toUpperCase())) return ship;
        if (ship.names.code && ship.names.code.toUpperCase().includes(name.toUpperCase())) return ship;
    }
    return null;
}
