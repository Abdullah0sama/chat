const express       = require('express');
const http          = require('http');
const path          = require('path');
const {Server}      = require('socket.io');


const app           = express();
const httpServer    = http.createServer(app);
const PORT          = process.env.PORT || 3000;
const io            = new Server(httpServer);


app.use(express.static(path.join(__dirname, 'public')));





app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/html/main.html');
})


io.on('connection', (socket) => {
    socket.on('disconnect', () => {
        console.log('User Disconnected');
    });
    socket.on('chat message', (msg) => {
        console.log(msg);
        io.emit('chat message', 'Hi from server');
    });

    console.log('User Connected');
})



httpServer.listen(PORT, () => {
    console.log('Server has started at port ' + PORT);
})
