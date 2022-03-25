const mongoose = require('mongoose');

const roomMemberSchema = new mongoose.Schema({
    userId: { type: String }, 
    roomId: { type: String },
    status: { type: String, enum: ['pending', 'joined'], default: 'joined'},
});

roomMemberSchema.index({ userId: 1, roomId: 1 });
module.exports = mongoose.model('RoomMember', roomMemberSchema);