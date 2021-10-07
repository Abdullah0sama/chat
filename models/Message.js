const mongoose = require('mongoose');

const messageSchema = mongoose.Schema({
    body: { type: String },
    time: { type: Number },
    user: { type: mongoose.SchemaTypes.ObjectId, ref: 'User' },
    room: { id: { type: mongoose.SchemaTypes.ObjectId } }
});

module.exports = mongoose.model('Message', messageSchema);
