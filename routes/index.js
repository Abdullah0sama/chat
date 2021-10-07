const express           = require('express');
const bcyrpt            = require('bcrypt');
const router            = express.Router();
const path              = require('path');
const saltRounds        = 10;
const User              = require('../models/User.js');
const validationSchema  = require('../validation.js');
const Joi               = require('joi');
const io                = require('../socketioEvents.js').getIo();

const Room              = require('../models/Room.js');
const RoomMember        = require('../models/RoomMember.js');
const Message           = require('../models/Message.js');

router.use(express.urlencoded({ extended: true }));
router.use(express.static('public'));
const htmlPath = path.resolve('./public/html');

router.get('/', pageAuthenticationProtection, (req, res) => {
    res.sendFile(htmlPath + '/main.html');
});

router.get('/login', (req, res) => {
    res.sendFile(htmlPath + '/login.html');
});

router.get('/signup', (req, res) => {
    res.sendFile(htmlPath + '/signup.html');
});

router.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

router.post('/signup', async (req, res) => {
    const user = req.body.user || {};

    try {

            const userValidation = await validationSchema.userValidationSchema.validateAsync(user);
            const isUsernameAvailable = await User.findOne({ username: user.username });
            if (isUsernameAvailable) throw new UserError( 'Username already used' );
        
            user.password = await bcyrpt.hash(user.password, saltRounds);
            
            const createdUser = await User.create(user);
            res.status(200).send({ msg: 'User Created Successfully' }); 

    } catch (err) {
        if (err instanceof UserError || err instanceof Joi.ValidationError) return res.status(422).send({ msg: err.message });
        else return res.status(500).send();
    }

});


router.post('/login', async (req, res) => {
    try {
        const user = req.body.user;
        let foundUser = await User.findOne({ username: user.username });
        let isPasswordCorrect;
            if(foundUser == null) 
                // Wasting time
                isPasswordCorrect = await bcyrpt.compare('icantremeber', '$2b$10$DHgmPDyXukbf3gKPhA6WhOiFst5PUtjhzgTsIv0TyyCHuaJJ4TrAW');
            else isPasswordCorrect = bcyrpt.compare(user.password, foundUser.password);
    
        if (isPasswordCorrect) {
                req.session.user = {};
                req.session.user.id = foundUser.id;
                req.session.user.username = foundUser.username;
                return res.status(200).send({ msg: 'Logged in successfully' });
            }else throw new UserError('Wrong username or password');

    } catch (err) {
        if (err instanceof UserError ) return res.status(401).send({ msg: err.message });
        else return res.status(500).send();
    }
});


// Join Room using room Id 
router.post('/room/:roomID/join/', isAuthenticated, async (req, res) => {

    const joinRequest = {
        userID: req.session.user.id, 
        roomID: req.params.roomID,
        password: req.body.roomPassword
    }
    try {

        const foundRoom = await Room.findById( joinRequest.roomID );
            
        if(foundRoom == null) throw new UserError('Room not Found');
        
        if(foundRoom.status == 'private') 
            if (joinRequest.password == '' || await bcyrpt.compare(joinRequest.password, foundRoom.password)) 
                throw new UserError('Wrong password');
        
        const createRelation = await RoomMember.create( joinRequest );
        
        // Emiting joined room
        io.to(req.session.user.id).emit('joined new room', foundRoom);
        // Joining room
        io.in(req.session.user.id).socketsJoin(foundRoom._id);

        return res.status(200).send({ msg: "Joined Successfully" });

    } catch (err) {
        console.log(err);
        if (err instanceof UserError) return res.status(422).send(err.message);
        else return res.status(500).send();

    };

});

// Creating a room
router.post('/room/', isAuthenticated, async (req, res) => {

    const roomInfo = req.body.room || {};

    try {

        const roomValidation = await validationSchema.RoomValidationSchema.validateAsync(roomInfo);
        
        // Hashing password if room is private
        if (roomInfo.status == 'private') roomInfo.password = await bcyrpt.hash(roomInfo.password, saltRounds);

        let roomData = await Room.create(roomInfo);

        let joinRequest = await RoomMember.create({
                                roomID: roomData._id,
                                userID: req.session.user.id
                            });
        
        // Announcing that a new room has been created to all other users
        io.except(req.session.user.id).emit('new room', roomData);
        // User joins the created room
        io.in(req.session.user.id).socketsJoin(roomData._id);
        // Emiting to the user data of the joined room
        io.in(req.session.user.id).emit('joined new room', roomData);

        return res.status(200).send({ msg: "Created Room Successfully" });

    } catch (err) {
        console.log(err);
        if (err instanceof Joi.ValidationError) return res.status(422).send(err.message);
        else return res.status(500).send();
    }

});

// Get all messages from a room
router.get('/room/:roomId', isAuthenticated, (req, res) => {

    Message.find({ 'room.id': req.params.roomId }).populate('user', 'username _id').then( (messages) => {
        
        return res.status(200).send( messages );

    }).catch( (err) => {
        
        return res.status(500).send();

    });

});


class UserError extends Error {
    constructor (message) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this);
    }
}
function makeError(name, msg) {
    let error = new Error(msg);
    error.name = name;
    return error;
}


// Checks if users are authenticated and sends a status code if not
function isAuthenticated (req, res, next) {
    if(!req.session.user) return res.status(401).send();
    else return next();
}
// Checks if users are authenticated and redirects them if not
function pageAuthenticationProtection (req, res, next) {
    if (!req.session.user) return res.redirect('/login');
    else return next();
}
module.exports = router;