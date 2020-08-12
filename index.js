const express = require('express');
const socket = require('socket.io');
const dotenv = require('dotenv');
const cors = require('cors');

const environment = dotenv.config();

const scan = require('./src/service/scan');

if (environment.error) process.exit();

const app = express();

app.use(cors());

const server = app.listen(process.env.PORT, function () {

    console.log(`http://localhost:${process.env.PORT}`);

});

const io = socket(server);

io.on('connection', (socket) => {

    console.log('connection');

    socket.on('sendUrl', (url) => {

        console.log('Url receiver', url);

        socket.emit('resultOfScan', url);

    });

    socket.on('disconnect', () => {

        console.log('disconnect');

    });

});