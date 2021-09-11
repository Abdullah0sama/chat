const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    name: { type: String },
    status: { type: String, enum: ['private', 'public'], default: 'public' },
    type: { type: String, enum: ['two', 'many'], default: 'many' }
});

module.exports = mongoose.model('Room', roomSchema);