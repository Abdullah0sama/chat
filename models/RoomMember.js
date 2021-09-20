const mongoose = require('mongoose');

const roomMemberSchema = new mongoose.Schema({
    userID: { type: String }, 
    roomID: { type: String },
    status: { type: String, enum: ['pending', 'joined'], default: 'joined'},
});

module.exports = mongoose.model('RoomMember', roomMemberSchema);