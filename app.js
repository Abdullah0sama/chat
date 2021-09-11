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





const indexRoute = require('./routes/index.js');

app.use(indexRoute);

const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);

io.use(wrap(session));


let roomTest = 'test';


io.on('connection', (socket) => {
    const connectedUser = socket.request.session.user;
    if(connectedUser == null) return socket.disconnect();
    socket.join(roomTest);

    socket.on('disconnect', () => {
        console.log('User Disconnected');
    });
    
    socket.on('chat message', (msg) => {
        msg.body += ' from server';
        msg.username = connectedUser.username;
        console.log(msg);
        socket.to(msg.room).emit('chat message', msg);
    });
    
    console.log(`${connectedUser.username} is connected`);
});



httpServer.listen(PORT, () => {
    console.log('Server has started at port ' + PORT);
})
