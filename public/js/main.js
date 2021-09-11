const socket = io();

const sendBtn = document.querySelector('#sendButton');
const inputMessage = document.querySelector('.send[name="message"]');
const roomName = document.querySelector('.send[name="roomName"]');

sendBtn.addEventListener('click', () => {
    let msg = {
        room: {
            name: roomName.value,
        },
        body: inputMessage.value,
    };

    socket.emit('chat message', msg);
    inputMessage.value = '';
});

socket.on('chat message', (msg) => {
    console.log(msg);
});

socket.on('available rooms', (rooms) => {
    console.log(rooms);
});

socket.on('error', (msg) => {
    console.log(msg);
});

// socket.onAny( (event, ...args) => {
//     console.log(event, args);
// });