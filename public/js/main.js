
const socket = io();

const sendBtn               = document.querySelector('#sendBtn');
const inputMessage          = document.querySelector('#message');
const chatRooms             = document.querySelectorAll('.chat-room');
const roomsGroup            = document.querySelector('.rooms');
const messagesGroup         = document.querySelector('.chat-messages');
const roomHeader            = document.querySelector('.room-header');
const joinedRoomsContainer  = document.querySelector('.joinedRooms');

const selectedRoom = {};
const messages = {};
let me;
let joinedRooms = [];

sendBtn.addEventListener('click', sendMessage);

// Sends a message when Enter is pressed
inputMessage.addEventListener('keypress', (event) => {
    if  (event.code == 'Enter' && selectedRoom.id) sendMessage();
});

function sendMessage() {
    let msg = {
        room: {
            id: selectedRoom.id
        },
        body: inputMessage.value,
        user: me,
        time: Date.now()
    };
    
    if(msg.body == '') return;
    
    addNewMessages([msg], msg.room.id);
    socket.emit('chat message', msg);
    
    inputMessage.value = '';
}

// Socket events

// Get joined rooms 
socket.on('rooms', (joined) => {

    joinedRoomsContainer.innerHTML = joined.map(room => roomNameNode(room, false)).join('');
    
    joinedRooms = joined;
    joinedRooms.forEach( (joinedRoom) => {
        getStoredMessages(joinedRoom._id)
        .then( (storedMessages) => addNewMessages(storedMessages, joinedRoom._id));
    });

});

socket.on('chat message', (msg) => {
    addNewMessages([msg], msg.room.id);
});


// Get information about connected client
socket.once('whoami',  (user) => {
    me = user;
    displayUsername(user.username);
});


function addNewRoom(roomData) {
    joinedRooms.push(roomData);
    joinedRoomsContainer.insertAdjacentHTML('beforeend', roomNameNode(roomData, false));
    getStoredMessages(roomData._id).then( (storedMsg) => addNewMessages(storedMsg, roomData._id));
};

socket.onAny( (events, ...args) => {
    console.log(events, args);
});



// Selects room which user chose and displays its messages  
function selectRoom(event) {
    event.stopPropagation();
    if(event.target.dataset.room_id == selectedRoom.id) return ;

    selectedRoom.id = event.target.dataset.room_id;
    if(selectedRoom.node) selectedRoom.node.classList.remove('active-chat');
    selectedRoom.node = event.target;
    displayRoomName(selectedRoom.node.dataset.room_name);
    selectedRoom.node.classList.add('active-chat');

    displayRoomMessages(selectedRoom.id);
}



function displayRoomName(name) {
    roomHeader.innerHTML = name;
}

function displayUsername (username) {
    document.querySelector('#display-username').innerHTML = username;
}

function roomNameNode(room, notJoined) {
    const { _id, name, status } = room;
    
    let event = (notJoined) ? 'data-bs-toggle="modal" data-bs-target="#joinModal"' : 'onclick=selectRoom(event)';;
    let icon = (notJoined && status == 'private') ? '<i class="fa-solid fa-lock"></i>' : '';
    return `<div type="button" class="chat-room p-3 text-light" data-room_name= "${name}" data-room_status="${status}" 
            id="${_id}" ${event} data-room_id="${_id}">
                <span>${name}</span>
                ${icon}
            </div>`;
}



// Adds message to storage and if it belongs to the selected room display it
function addNewMessages(msg, roomId) {
    addMessageToStorage(msg, roomId);
    if(selectedRoom.id == roomId) displayRecievedMsg(msg);
}
// Display recieved message
function displayRecievedMsg(msg) {
    messagesGroup.innerHTML += msg.map(createMsgNode).join('');
    messagesGroup.scrollTo(0, messagesGroup.scrollHeight);
}
// Display stored messages
function displayRoomMessages(roomId) {
    if (!messages[roomId]) return;
    messagesGroup.innerHTML = messages[roomId].map(createMsgNode).join('');
    messagesGroup.scrollTo(0, messagesGroup.scrollHeight);
}
// Add message to storage
function addMessageToStorage(msg, roomId) {
    if(messages[roomId] == null) {
        messages[roomId] = [];
    }
    messages[roomId].push(...msg);
}
// Create html tag for message
function createMsgNode(msg) {
    const {time, user, body} = msg;
    let username = user.username;
    let msgOwner = 'others_msg';
    if(username == me.username) msgOwner = 'my_msg', username = '';

    let messageNode = `<div class=" fs-6 message ${msgOwner}">
                        <span class="username">${username}</span>
                        <p class="body">${body}</p>
                        <span class="msg-time text-muted">${dateFormat(time)}</span>
                    </div>`
    return messageNode;
}
// Changing date format according to how much time has passed 
function dateFormat(time) {
    let messageTime = new Date(time);
    if ( time > Date.now() - 24 * 60 * 60 * 1000 ) return `${ messageTime.getHours() }:${ messageTime.getMinutes() }`
    else return messageTime.toDateString();
}
// Getting old messages 
async function  getStoredMessages (roomId) {
    let messages = [];
    res = await fetch(`/room/${roomId}`)
    if (res.status == 200) return messages = await res.json();

    return messages;
}


const joinHandler = {
    'modal': document.querySelector('#joinModal'),
    'roomNameN': document.querySelector('#modal-room-name'),
    'roomId': document.querySelector('#modal-room-id'),
    'roomPasswordNode': document.querySelector('#modal-room-password'),
    'roomPasswordNodeInput': document.querySelector('#modal-room-password input'),
    'alertNode': document.querySelector('#joinModal .alert'),
    showAlert: function(msg) {
        this.alertNode.innerHTML = msg;
        this.alertNode.classList.remove('d-none');
    }, 
    hideAlert: function() {
        this.alertNode.classList.add('d-none');
    } ,
    getRoomInfo: function() {
        return {
            password: this.roomPasswordNodeInput.value, 
            _id: this.roomId.value, 
            status: this.room_status, 
            name: this.roomNameN.value
        }
        
    }
}

document.querySelector('#joinModalForm').addEventListener('submit', (event) => {
    event.preventDefault();
    
    let roomInfo = joinHandler.getRoomInfo();
    sendJoinRequest(roomInfo._id, roomInfo.password)
    .then((data) => { 
        document.querySelector('#joinModal .btn-close').click();
        listenToRoom(roomInfo);
    })
    .catch((err) => {
        joinHandler.showAlert(err); 
    });
});

// Setting values of form
joinHandler.modal.addEventListener('show.bs.modal', function(event) {
    joinHandler.hideAlert();
    let button = event.relatedTarget;
    joinHandler.roomNameN.value = button.dataset.room_name;
    joinHandler.roomId.value = button.dataset.room_id;
    joinHandler.roomPasswordNodeInput.value = '';
    joinHandler.room_status = button.dataset.room_status;
    if (joinHandler.room_status == 'private') joinHandler.roomPasswordNode.classList.remove('d-none');
    else joinHandler.roomPasswordNode.classList.add('d-none');
});

function sendJoinRequest(roomId, roomPassword) {
    return fetch(`/room/${roomId}/join`, {
        method: 'POST', 
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'roomPassword='+encodeURIComponent(roomPassword)
    }).then( async (res) => {
        const data = await res.json();
        if (res.status == 200) {
            return data;
        } else {
            throw data.msg;
        }
    });
}

const createHandler = {
    'alert': document.querySelector('#createModal .alert'),
    'hideAlert': function() { this.alert.classList.add('d-none'); },
    'showAlert': function(msg) {
        this.alert.innerHTML = msg;
        this.alert.classList.remove('d-none');
    },
    form: document.querySelector('#createModalForm')
}

createHandler.form.addEventListener('submit', (event) => {
    event.preventDefault();
    
    const data = new URLSearchParams( new FormData(event.target) );
    if (!data.has('room[status]')) data.set('room[status]', 'public'), data.delete('room[password]');
    sendRoomCreationRequest(data)
    .then((data) => {
        document.querySelector('#createModal .btn-close').click();
        listenToRoom(data.room);
    })
    .catch((err) => {
        createHandler.showAlert(err);
    });
});

function sendRoomCreationRequest(roomInfo) {
    return fetch('/room', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: roomInfo
    }).then( async (res) => {
        const data = await res.json();
        if (res.status == 200) {   
            return data; 
        }
        else {
            throw data.msg;
        }
    });
}

// Clearing values previous request
document.querySelector('#createModal').addEventListener('show.bs.modal', function(event) {
    createHandler.hideAlert();
    modalCreateForm.reset();
});


// Listen to room to get new message from it
// Used after creating or joining a new room
function listenToRoom(roomInfo) {
    socket.emit('listenToRoom', roomInfo._id);
    addNewRoom(roomInfo)
}

// Explored Button modal 
const searchRoomsInput = document.querySelector('#searchRoomsInput')
const exploredRooms = document.querySelector('#exploredRooms');

searchRoomsInput.addEventListener('keydown', event => {
    if(event.code != 'Enter') return;
    const queryRoom = searchRoomsInput.value;

    fetch('/room?' + new URLSearchParams({
        likeRoomName: queryRoom,
    }))
    .then(req => req.json())
    .then(data => {
        displayExploredRooms(data.rooms.filter(room => !joinedRooms.find(joinedRoom => joinedRoom._id == room._id)));
    })

});

function displayExploredRooms(roomsInfo) {
    exploredRooms.innerHTML = roomsInfo.map((room) => roomNameNode(room, true)).join('');
}


function startup() {
    const defaultExploredRooms = [
        {"_id": "6237bed726b644113142d43b","status":"public","type":"many","name":"Nature"},
        {"_id": "6237bee326b644113142d440","status":"public","type":"many","name":"Movies"},
        {"_id": "6237beeb26b644113142d445","status":"public","type":"many","name":"Random"}
    ]
    displayExploredRooms(defaultExploredRooms);
}

startup();  