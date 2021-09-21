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
const RoomMember = require('./models/RoomMember.js');





const indexRoute = require('./routes/index.js');

app.use(indexRoute);

const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);

io.use(wrap(session));


io.on('connection', async (socket) => {
    const connectedUser = socket.request.session.user;
    if(connectedUser == null) return socket.disconnect();

    let joinedRoomsID = [];
    let joinedRooms = [];
    let allRooms = [];
    let otherRooms = [];

    await RoomMember.find({ userID: connectedUser.id }).then( (joinRequests) => {
        joinRequests.forEach(request => {
            socket.join(request.roomID);
            joinedRoomsID.push(request.roomID);
        });
    }).catch( (err) => {
        console.log(err); 
    });


    await Room.find({ }).then( rooms => {
        allRooms = rooms;
    });

    allRooms.forEach( room => {
        if (joinedRoomsID.includes(room.id)) joinedRooms.push(room);
        else otherRooms.push(room);
    });

    socket.emit('joined rooms', joinedRooms);

    socket.emit('all rooms', allRooms);

    socket.emit('other rooms', otherRooms);
    

    socket.emit('whoami', { username: connectedUser.username });

    socket.on('disconnect', () => {
        console.log(`User ${connectedUser.username} Disconnected`);
    });
    
    socket.on('chat message', (msg) => {
        if(msg.body == '') return; 

        // Not trusting the user
        msg.user = connectedUser;
        msg.time = Date.now();
        
        RoomMember.findOne({ roomID: msg.room.id, userID: msg.user.id }).then( (foundRelation) => {
            console.log(msg);
            if(foundRelation == null) socket.emit('error', 'You are not joined in this room.');
            else socket.to(msg.room.id).emit('chat message', msg);

        });

    });
    
    console.log(`User ${connectedUser.username} is connected`);
});



httpServer.listen(PORT, () => {
    console.log('Server has started at port ' + PORT);
})
