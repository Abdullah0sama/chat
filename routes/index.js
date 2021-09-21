const express           = require('express');
const bcyrpt            = require('bcrypt');
const router            = express.Router();
const path              = require('path');
const saltRounds        = 10;
const User              = require('../models/User.js');
const Room              = require('../models/Room.js');
const RoomMember        = require('../models/RoomMember.js');


router.use(express.urlencoded({ extended: true }));
router.use(express.static('public'));
const htmlPath = path.resolve('./public/html');

router.get('/', isAuthenticated, (req, res) => {
    res.sendFile(htmlPath + '/main.html');
});

router.get('/signup', (req, res) => {
    res.sendFile(htmlPath + '/signup.html');
});

router.post('/signup', (req, res) => {
    const user = req.body.user;

    User.findOne({ username: user.username }).then( (usernameStatus) => {
        if(usernameStatus != null) throw makeError('user', 'Username already used'); 
        return  bcyrpt.hash(user.password, saltRounds);
    }).then( (hash) => {
        user.password = hash;
        return User.create(user);
    }).then( (userCreated) => {
        return res.redirect('/login');
    }).catch( (err) => {
        if(err.name != 'user') err.message = 'internal error';
        res.redirect(`/signup?error=${err.message}`);
    });

});

router.get('/login', (req, res) => {
    res.sendFile(htmlPath + '/login.html');
});


router.post('/login', (req, res) => {
    const user = req.body.user;
    let loggedInUser;
    User.findOne({ username: user.username }).then( (userFound) => {

        if(userFound == null) 
            return bcyrpt.compare('icantremeber', '$2b$10$DHgmPDyXukbf3gKPhA6WhOiFst5PUtjhzgTsIv0TyyCHuaJJ4TrAW');
        loggedInUser = userFound;
        return bcyrpt.compare(user.password, userFound.password);

    }).then( (isPasswordCorrect) => {
        if(isPasswordCorrect) {
            req.session.user = {};
            req.session.user.id = loggedInUser.id;
            req.session.user.username = loggedInUser.username;
            res.redirect('/');
        }else {
            throw makeError('user', 'Wrong username or password');
        }
    }).catch( (err) => {
        if(err.name != 'user') err.message = 'internal error';
        res.redirect(`/login?error=${err.message}`);
    });

});


// Join Room using Id 
router.post('/room/:roomID/join/', isAuthenticated, (req, res) => {
    const joinRequest = {
        userID: req.session.user.id, 
        roomID: req.params.roomID,
        password: req.body.roomPassword
    }
    Room.findById( req.params.roomID ).then( (foundRoom) => {
        
        if(foundRoom == null) {
            res.statusMessage = "Room not found";
            return res.status(400).send();
        }
        if(foundRoom.status == 'private') {
            if (joinRequest.password == '' || !bcyrpt.compareSync(joinRequest.password, foundRoom.password)) 
                return res.status(401).send('Wrong password.');
        }

        return RoomMember.create( joinRequest );
    }).then( (joinStatus) => {
        res.send(joinStatus);
    }).catch( (err) => {
        console.log(err);
        res.status(500).send();
    });

});

router.post('/room/', (req, res) => {
    let roomInfo = req.body.room;
    if (roomInfo.status == 'private') roomInfo.password = bcyrpt.hashSync(roomInfo.password, saltRounds);
    Room.create(roomInfo).then( (room) => {

        return RoomMember.create({
            roomID: room._id,
            userID: req.session.user.id
        });
    }).then( (joinRequest) => {

        res.send({ msg: "Created Successfully"});

    }).catch( (err) => {
        console.log(err);
        res.status(500).send();
    });

});



function makeError(name, msg) {
    let error = new Error(msg);
    error.name = name;
    return error;
}

// Checks if the user is authenticated. If true the flow continues normally, else redirects them to the login page.
function isAuthenticated(req, res, next) {
    if(!req.session.user || !req.session.user.id) return res.redirect(`/login?msg=${encodeURIComponent('You must be logged in.')}`);
    User.findById(req.session.user.id).then( (user) => {
        if(user == null) return res.redirect(`/login?msg=${encodeURIComponent('You must be logged in.')}`);
        else return next();
    });
}

module.exports = router;