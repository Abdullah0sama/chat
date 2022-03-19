
const socket = io();

const sendBtn               = document.querySelector('#sendBtn');
const inputMessage          = document.querySelector('#message');
const chatRooms             = document.querySelectorAll('.chat-room');
const roomsGroup            = document.querySelector('.rooms');
const messagesGroup         = document.querySelector('.chat-messages');
const roomHeader            = document.querySelector('.room-header');
const joinedRoomsContainer  = document.querySelector('.joinedRooms');
const otherRoomsContainer   = document.querySelector('.otherRooms');

const selectedRoom = {};
const messages = {};
let me;
let joinedRooms = [];
let otherRooms = [] ;

socket.emit('refresh rooms');

sendBtn.addEventListener('click', sendMessage);

// Sends a message when Enter is pressed
inputMessage.addEventListener('keypress', (event) => {
    if  (event.code == 'Enter') sendMessage();
});

function sendMessage (){
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
socket.on('rooms', (joined, other) => {

    otherRoomsContainer.innerHTML = other.map(room => roomNode(room, true)).join('');
    joinedRoomsContainer.innerHTML = joined.map(room => roomNode(room, false)).join('');
    
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

socket.on('new room', (roomData) => {
    
    otherRooms.push(roomData);
    otherRoomsContainer.innerHTML += roomNode(roomData, true);

});

socket.on('joined new room', (roomData) => {

    joinedRooms.push(roomData);
    joinedRoomsContainer.innerHTML += roomNode(roomData, false);
    getStoredMessages(roomData._id).then( (storedMsg) => addNewMessages(storedMsg, roomData._id));

});

socket.onAny( (events, ...args) => {
    console.log(events, args);
});



// Selects room which user chose and displays its messages  
function selectRoom(event) {
    event.stopPropagation();
    if(event.target.id == selectedRoom.id) return ;

    selectedRoom.id = event.target.dataset.id;
    if(selectedRoom.node) selectedRoom.node.classList.remove('active-chat');
    selectedRoom.node = event.target;
    roomHeader.innerHTML = selectedRoom.node.dataset.name;
    selectedRoom.node.classList.add('active-chat');

    displayRoomMessages(selectedRoom.id);
}


function roomNode(room, notJoined) {
    const { _id, name, status } = room;
    
    let attributes = 'onclick=selectRoom(event)';
    if (notJoined) attributes = 'data-bs-toggle="modal" data-bs-target="#joinModal"';

    return `<div type="button" class="chat-room p-3 text-light" data-name= "${name}" data-status="${status}" 
            id="${_id}" ${attributes} data-id="${_id}">
                <span>${name}</span>
            </div>`;
}



// Adds message to the storage and displays it if it belongs to the selected room
function addNewMessages(msg, roomId) {
    addMessageToStorage(msg, roomId);
    if(selectedRoom.id == roomId) {
        messagesGroup.innerHTML += msg.map(createMsgNode).join('');
        messagesGroup.scrollTo(0, messagesGroup.scrollHeight);
    }
}
// display messages
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
    let meClass = '';
    if(user.username == me.username) meClass = 'me', user.username = 'me';

    let messageNode =  `<div class="d-flex fs-6 align-items-stretch  ${meClass} message  ">
                            <div class="user-name align-middle d-flex align-items-center  text-dark">
                                <span class="text-center w-100">${user.username}</span>
                            </div>
                            <p class="m-0  text-light text-break">${body}<br>
                            <span class="float-end">${dateFormat(time)}</span></p>
                        </div>`;
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



const joinModal                 = document.querySelector('#joinModal');
const modalRoomName             = document.querySelector('#modal-room-name');
const modalRoomId               = document.querySelector('#modal-room-id');
const modalRoomPassword         = document.querySelector('#modal-room-password');
const modalRoomPasswordInput    = document.querySelector('#modal-room-password input');
const joinModalForm             = document.querySelector('#joinModalForm');
const alertJoinModal            = document.querySelector('#joinModal .alert');

joinModalForm.addEventListener('submit', (event) => {
    event.preventDefault();
    alertJoinModal.classList.add('d-none');

    const data = new FormData(event.target);
    const roomId = data.get('roomId');
    const roomPassword = data.get('password');
    fetch(`/room/${roomId}/join`, {
        method: 'POST', 
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'roomPassword='+encodeURIComponent(roomPassword)
    }).then( (res) => {
        
        if (res.status == 200) {
            document.querySelector('#joinModal .btn-close').click();
            document.querySelector(`.otherRooms [data-id='${roomId}']`).remove();
            return null;
        } else return res.json();
    }).then( (res) => {
        if (!res) return;
        console.log(res);
        alertJoinModal.innerHTML = res.msg;
        alertJoinModal.classList.remove('d-none');
    })
    .catch( (err) => {
        console.log(err);
    });
});
joinModal.addEventListener('show.bs.modal', function(event) {
    alertJoinModal.classList.add('d-none');
    let button = event.relatedTarget;
    modalRoomName.value = button.dataset.name;
    modalRoomId.value = button.dataset.id;
    modalRoomPasswordInput.value = '';
    if (button.dataset.status == 'private') modalRoomPassword.classList.remove('d-none');
    else if (button.dataset.status == 'public') modalRoomPassword.classList.add('d-none');
    
});





const modalCreateForm   = document.querySelector('#createModalForm');
const alertCreateForm   = document.querySelector('#createModal .alert');
const createModal       = document.querySelector('#createModal');
const createPassword    = document.querySelector('#createModal #createPassword');
const createName        = document.querySelector('#createModal #createName');

modalCreateForm.addEventListener('submit', (event) => {
    event.preventDefault();
    alertCreateForm.classList.add('d-none');

    const data = new URLSearchParams( new FormData(event.target) );
    if (!data.has('room[status]')) data.set('room[status]', 'public'), data.delete('room[password]');
    fetch('/room', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: data
    }).then( (res) => {
        console.log(res);
        if (res.status == 200) {
            document.querySelector('#createModal .btn-close').click();
            return null;
        }
        else return res.json();
    }).then( (json) => {
        if(!json) return;
        alertCreateForm.innerHTML = json.msg;
        alertCreateForm.classList.remove('d-none');

    }).catch ( (err) => {
        console.log(err);
    });
});


createModal.addEventListener('show.bs.modal', function(event) {
    alertCreateForm.classList.add('d-none');
    createPassword.value = '';
    createName.value = '';
});



function displayUsername (username) {
    document.querySelector('#display-username').innerHTML = username;
}






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
        displayExploredRooms(data.rooms);
    })

});

function displayExploredRooms(roomsInfo) {
    exploredRooms.innerHTML = roomsInfo.map((room) => 
    `<div class="p-2">${room.name}</div>`
    ).join('');
}