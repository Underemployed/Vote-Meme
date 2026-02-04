const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    department: String,
    year: String,
    timestamp: { type: Date, default: Date.now }
});

const posterSchema = new mongoose.Schema({
    participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant', required: true },
    participantName: String,
    imageUrl: String,
    fileName: String,
    canvaLink: String,
    likes: { type: Number, default: 0 },
    likedBy: [{ type: String }], // Store voter IDs/sessions
    uploadDate: { type: Date, default: Date.now }
});

const Participant = mongoose.model('Participant', participantSchema);
const Poster = mongoose.model('Poster', posterSchema);

module.exports = { Participant, Poster };