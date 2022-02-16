const express           = require('express');
const http              = require('http');
const path              = require('path');
const mongoose          = require('mongoose');
const expressSession    = require('express-session');
const app               = express();
const httpServer        = http.createServer(app);
const PORT              = process.env.PORT || 3000;




const session = expressSession({
    secret:             process.env.chatSessionSecret,
    resave:             false,
    saveUninitialized:  false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
    }
});

require('./socketioEvents.js').initializeSocketIO(httpServer, session);

app.use(session);
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect('mongodb://localhost/testChat', {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true})
// mongoose.connect(`mongodb+srv://${process.env.chatDBUser}:${process.env.chatDBPassword}@cluster0.ptdde.mongodb.net/${'chatDatabase'}?retryWrites=true&w=majority`, 
//                 {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true})
.then( () => {
    console.log('Connected to Database!');
}).catch( (err) => {
    console.log(err);
});

mongoose.set('debug', true);


// Routes 
const indexRoute = require('./routes/index.js');
const roomRoute = require('./routes/room.js');

app.use(indexRoute);
app.use('/room/', roomRoute);



httpServer.listen(PORT, () => {
    console.log('Server has started at port ' + PORT);
})
