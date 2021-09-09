const socket = io();

const sendBtn = document.querySelector('#sendButton');
sendBtn.addEventListener('click', () => {
    socket.emit('chat message', 'Hello there');
});

socket.on('chat message', (msg) => {
    console.log(msg);
});