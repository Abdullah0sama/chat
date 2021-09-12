const express           = require('express');
const http              = require('http');
const path              = require('path');
const {Server}          = require('socket.io');
const mongoose          = require('mongoose');
const expressSession    = require('express-session');
const app               = express();
const httpServer        = http.createServer(app);
const PORT              = process.env.PORT || 3000;
const io                = new Server(httpServer);


app.use(express.static(path.join(__dirname, 'public')));

const session = expressSession({
    secret: 'nothnsnfan323hu3@R3nTG$3f32fs',
    resave: false,
    saveUninitialized: false,
});
app.use(session);

mongoose.connect('mongodb://localhost/testChat', {useNewUrlParser: true, useUnifiedTopology: true})
    .then( () => {
        console.log('Connected to Database!');
    }).catch( (err) => {
        console.log(err);
});

const User = require('./models/User.js');
const Room = require('./models/Room.js');

const rooms = [{name: 'Math'}, {name: 'Biology'}, {name: 'History'}];
// Room.create(rooms ).then( (room) => {
//     console.log(room);
// }).catch( (err) => {
//     console.log(err);
// });




const indexRoute = require('./routes/index.js');

app.use(indexRoute);

const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);

io.use(wrap(session));


io.on('connection', (socket) => {
    const connectedUser = socket.request.session.user;
    if(connectedUser == null) return socket.disconnect();

    // Add user to all rooms 
    rooms.forEach( room => socket.join(room.name));

    socket.emit('available rooms', rooms);
    socket.emit('whoami', { username: connectedUser.username });

    socket.on('disconnect', () => {
        console.log(`User ${connectedUser.username} Disconnected`);
    });
    
    socket.on('chat message', (msg) => {
        msg.user.username = connectedUser.username;
        msg.time = Date.now();
        console.log(msg);
        Room.findOne({name: msg.room.name }).then( (foundRoom) => {
            console.log(foundRoom);
            if(foundRoom == null) return socket.emit('error', 'Room not found');
            if(foundRoom.status == 'public') {
                socket.to(msg.room.name).emit('chat message', msg);
            } else {
                socket.emit('error', 'later');
            } 
        });

    });
    
    console.log(`User ${connectedUser.username} is connected`);
});



httpServer.listen(PORT, () => {
    console.log('Server has started at port ' + PORT);
})
