const {Server} = require('socket.io');
let io;

const RoomMember    = require('./models/RoomMember');
const Message       = require('./models/Message');
const Room          = require('./models/Room');

function initializeSocketIO (httpServer, session) {

    const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
    
    
    io = new Server(httpServer);
    
    io.use(wrap(session));
    
    io.on('connection', (socket) => {
        const connectedUser = socket.request.session.user;

        if(connectedUser == null) return socket.disconnect();

        console.log(connectedUser);
        socket.join(connectedUser.id);

        getJoinedRooms(connectedUser.id).then( (rooms) => {
            connectedUser.joinedRooms = rooms;
            console.log(rooms);
            rooms.forEach( (room => socket.join(room.id)));
            socket.emit('rooms', rooms);        
        });
        
        socket.emit('whoami', { username: connectedUser.username });
        
        socket.on('chat message', (msg) => {
            isRoomJoined = connectedUser.joinedRooms.find(room => room.id == msg.room.id);
            // Checking if the user is not joined in the room
            if(!isRoomJoined) return socket.emit('error', 'You are not joined in this room.');
            
            msg.time = Date.now();
            msg.user = connectedUser.id;
            // Saving message to the database
            Message.create(msg).catch( (err) => console.log(err) );
            msg.user = connectedUser;
            // Emiting message to all other users in the room
            socket.to(msg.room.id).emit('chat message', msg);
            
        });
        
        socket.on('listenToRoom', async (roomId) => {
            const membershipInfo = await RoomMember.findOne({ roomId: roomId, userId: connectedUser.id });
            if(!membershipInfo) return;
            socket.join(roomId);
            let room = await Room.findById(roomId)
            connectedUser.joinedRooms.push(room);

        });

        socket.on('disconnect', () => {
            console.log(`User ${connectedUser.username} Disconnected`);
        });
        
        console.log(`User ${connectedUser.username} is connected`);
    });
    
}


async function getJoinedRooms(userId) {
        let joinedRoomsId = await findMyRoomsIds(userId);
        return await Room.find({ '_id': {'$in': joinedRoomsId }}, { 'password': 0 });    
}
function findMyRoomsIds (userId) {
    return RoomMember.find({ userId: userId }).then( (joinRequests) => {
        return joinRequests.map( (joinRequest) => joinRequest.roomId);
    });
}


module.exports = {
    initializeSocketIO
}