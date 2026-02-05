const mongoose = require("mongoose");

const PosterSchema = new mongoose.Schema({
    name: String,
    email: String,
    posters: [String], // file paths
    likes: {
        type: Number,
        default: 0
    },
    likedIPs: [String]
});

module.exports = mongoose.model("Poster", PosterSchema);
