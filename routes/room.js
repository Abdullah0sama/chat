const express                   = require('express');
const router                    = express.Router();
const { isAuthenticated }       = require('../middleware.js');
const Joi                       = require('joi');
const validationSchema          = require('../validation.js');
const bcyrpt                    = require('bcrypt');

const Room                      = require('../models/Room.js');
const RoomMember                = require('../models/RoomMember.js');
const Message                   = require('../models/Message.js');
const SALTROUNDS                = 10

const { joinRoom, announceJoiningRoom, announceCreatedRoom }  = require('../socketioEvents.js');


// Get rooms according to query params
// ?likeRoomName: get rooms similar to that name
router.get('/', async (req, res) => {
    try {
        const queryRooms = req.query.likeRoomName;
        const foundRooms = await Room.find({ name: { $regex: `.*${queryRooms}.*` }}, {password: 0});
        return res.status(200).send({ rooms: foundRooms });
    }catch (err) {
        console.log(err);
        return res.status(500).send();
    }

});
// Join Room using room Id 
router.post('/:roomID/join/', isAuthenticated, async (req, res) => {

    const joinRequest = {
        userID: req.session.user.id, 
        roomID: req.params.roomID,
        password: req.body.roomPassword
    }
    try {

        const foundRoom = await Room.findById(joinRequest.roomID);
        if(foundRoom == null) 
            throw new UserError('Room not Found');
        
        if(foundRoom.status == 'private') 
            if (joinRequest.password == '' || !(await bcyrpt.compare(joinRequest.password, foundRoom.password))) 
                throw new UserError('Wrong password');
        
        await RoomMember.create( joinRequest );
        
        announceJoiningRoom(req.session.user.id, foundRoom);
        joinRoom(req.session.user.id, foundRoom._id);

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

        await validationSchema.RoomValidationSchema.validateAsync(roomInfo);
        
        // Hashing password if room is private
        if (roomInfo.status == 'private') 
            roomInfo.password = await bcyrpt.hash(roomInfo.password, SALTROUNDS);

        // Creating room
        let createdRoomInfo = await Room.create(roomInfo);

        // Joining the created room 
        await RoomMember.create({
                                roomID: createdRoomInfo._id,
                                userID: req.session.user.id
                            });
        
        announceCreatedRoom(req.session.user.id, createdRoomInfo);
        announceJoiningRoom(req.session.user.id, createdRoomInfo);
        joinRoom(req.session.user.id, createdRoomInfo._id);

        return res.status(200).send({ msg: "Room created successfully" });
    } catch (err) {
        console.log(err);
        if (err instanceof Joi.ValidationError) return res.status(422).send({ msg: err.message });
        else return res.status(500).send();
    }

});

// Get all messages from room
router.get('/:roomId', isAuthenticated, (req, res) => {

    Message.find({ 'room.id': req.params.roomId }).populate('user', 'username _id').then( (messages) => {
        return res.status(200).send( messages );
    }).catch( (err) => {
        return res.status(500).send();
    });

});

module.exports = router;