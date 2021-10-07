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



const session = expressSession({
    secret: 'nothnsnfan323hu3@R3nTG$3f32fs',
    resave: false,
    saveUninitialized: false,
});

app.use(session);
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect('mongodb://localhost/testChat', {useNewUrlParser: true, useUnifiedTopology: true})
.then( () => {
    console.log('Connected to Database!');
}).catch( (err) => {
    console.log(err);
});

// Models 
const User          = require('./models/User.js');
const Room          = require('./models/Room.js');
const RoomMember    = require('./models/RoomMember.js');
const Message       = require('./models/Message.js');

// Routes 
const indexRoute = require('./routes/index.js');
app.use(indexRoute);

const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);

io.use(wrap(session));

mongoose.set('debug', true);

io.on('connection', (socket) => {
    const connectedUser = socket.request.session.user;
    if(connectedUser == null) return socket.disconnect();
    
    socket.on('refresh rooms', async () => {
        
        let joinedRoomsId = await findMyRoomsIds(connectedUser.id);
        let allRooms = await Room.find({});
        let joinedRooms = [];
        let otherRooms = [];
        allRooms.forEach( (room) => {
            if (joinedRoomsId.includes(room.id)) {
                joinedRooms.push(room);
                socket.join(room.id);
            } else {
                otherRooms.push(room);
            }
        });
        socket.emit('rooms', allRooms, joinedRooms, otherRooms);
    });
    
    
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

            if(foundRelation == null) return socket.emit('error', 'You are not joined in this room.');

            socket.to(msg.room.id).emit('chat message', msg);
            Message.create(msg).then((s) => console.log(s)).catch( (err) => console.log(err) );
            
        });
        
    });
    
    console.log(`User ${connectedUser.username} is connected`);
});


function findMyRoomsIds (userId) {
    return RoomMember.find({ userID: userId }).then( (joinRequests) => {
        
        return joinRequests.map( (joinRequest) => joinRequest.roomID);
        
    });
}



httpServer.listen(PORT, () => {
    console.log('Server has started at port ' + PORT);
})
