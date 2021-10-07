const {Server} = require('socket.io');
let io;

const RoomMember    = require('./models/RoomMember');
const Message       = require('./models/Message');
const Room          = require('./models/Room');

exports.initialize = function (httpServer, session) {

    const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
    
    
    io = new Server(httpServer);
    
    io.use(wrap(session));
    
    io.on('connection', (socket) => {
        const connectedUser = socket.request.session.user;

        if(connectedUser == null) return socket.disconnect();
        console.log(connectedUser);
        socket.join(connectedUser.id);
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
            msg.user = connectedUser.id;
            msg.time = Date.now();
            
            RoomMember.findOne({ roomID: msg.room.id, userID: msg.user }).then( (foundRelation) => {
    
                if(foundRelation == null) return socket.emit('error', 'You are not joined in this room.');
    
                Message.create(msg).then((message) => console.log(message)).catch( (err) => console.log(err) );
                msg.user = connectedUser;
                socket.to(msg.room.id).emit('chat message', msg);
                
            });
            
        });
        
        console.log(`User ${connectedUser.username} is connected`);
    });
    
}

function findMyRoomsIds (userId) {
    return RoomMember.find({ userID: userId }).then( (joinRequests) => {
        
        return joinRequests.map( (joinRequest) => joinRequest.roomID);
        
    });
}

exports.getIo = () => io;