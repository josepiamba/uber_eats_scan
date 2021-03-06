const express = require('express');
const socket = require('socket.io');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');

const environment = dotenv.config();

const mainRouter = require('./src/routes/index');

const scan = require('./src/service/scan');

if (environment.error) process.exit();

const app = express();

app.use(cors());

if (process.env.ENVIOREMENT == 'developing') app.use(morgan('dev'));

app.use(mainRouter);

const server = app.listen(process.env.PORT, function () {

    console.log(`URL: ${process.env.URL}`, `PORT: ${process.env.PORT}`);

});

const io = socket(server);

io.on('connection', (socket) => {

    console.log('connection');

    socket.on('sendUrl', async (url) => {

        console.log('Url receiver', url);

        let resultOfScan = await scan(socket, url);

        if (resultOfScan) socket.emit('resultOfScan', resultOfScan);

    });

    socket.on('disconnect', () => {

        console.log('disconnect');

    });

});