const express                   = require('express');
const router                    = express.Router();
const io                        = require('../socketioEvents.js').getIo();
const pushNewRoom               = require('../socketioEvents.js').pushNewRoom;
const Room                      = require('../models/Room.js');
const RoomMember                = require('../models/RoomMember.js');
const Message                   = require('../models/Message.js');
const { isAuthenticated }       = require('../middleware.js');
// Join Room using room Id 
router.post('/:roomID/join/', isAuthenticated, async (req, res) => {

    const joinRequest = {
        userID: req.session.user.id, 
        roomID: req.params.roomID,
        password: req.body.roomPassword
    }
    try {

        const foundRoom = await Room.findById(joinRequest.roomID);
        if(foundRoom == null) throw new UserError('Room not Found');
        
        if(foundRoom.status == 'private') 
            if (joinRequest.password == '' || !(await bcyrpt.compare(joinRequest.password, foundRoom.password))) 
                throw new UserError('Wrong password');
        
        const createRelation = await RoomMember.create( joinRequest );
        
        // Emiting joined room
        io.to(req.session.user.id).emit('joined new room', foundRoom);
        // Joining room
        io.in(req.session.user.id).socketsJoin(foundRoom._id);

        return res.status(200).send({ msg: "Joined Successfully" });

    } catch (err) {
        console.log(err);
        if (err instanceof UserError) return res.status(422).send({ msg: err.message });
        else return res.status(500).send();

    };

});

// Creating a room
router.post('/', isAuthenticated, async (req, res) => {

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
        // Push new room to cached rooms
        pushNewRoom(roomData);

        return res.status(200).send({ msg: "Created Room Successfully" });

    } catch (err) {
        console.log(err);
        if (err instanceof Joi.ValidationError) return res.status(422).send({ msg: err.message });
        else return res.status(500).send();
    }

});

// Get all messages from a room
router.get('/:roomId', isAuthenticated, (req, res) => {

    Message.find({ 'room.id': req.params.roomId }).populate('user', 'username _id').then( (messages) => {
        
        return res.status(200).send( messages );

    }).catch( (err) => {
        
        return res.status(500).send();

    });

});

module.exports = router;