const express = require('express');
const router = express.Router();
const path = require('path');
const { Participant, Poster } = require('../models/Poster');

const savePath = path.join(__dirname, '..', 'public', 'uploads', 'posters', fileName);

// Poster gallery - Public voting interface
app.get("/posters", async (req, res) => {
    try {
        const posters = await Poster.find().populate('participantId').sort({ likes: -1 });
        const participants = await Participant.find().sort({ name: 1 });
        res.render("posters/gallery", { posters, participants, voterId: req.session.voterId });
    } catch (err) {
        res.status(500).send('Error loading posters: ' + err.message);
    }
});

// Poster admin panel
app.get("/posters/admin", async (req, res) => {
    try {
        const participants = await Participant.find().sort({ name: 1 });
        const posters = await Poster.find().populate('participantId');
        res.render("posters/admin", { participants, posters });
    } catch (err) {
        res.status(500).send('Error loading admin page: ' + err.message);
    }
});

// Use poster routes
app.use(posterRoutes);
// Get all participants
router.get('/api/participants', async (req, res) => {
    try {
        const participants = await Participant.find().sort({ name: 1 });
        res.json(participants);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add new participant
router.post('/api/participants', async (req, res) => {
    try {
        const participant = new Participant(req.body);
        await participant.save();
        res.json({ success: true, participant });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Upload poster
router.post('/api/upload-poster', async (req, res) => {
    try {
        const { participantId, canvaLink } = req.body;

        if (!participantId) {
            return res.status(400).json({ success: false, error: 'Participant ID required' });
        }

        const participant = await Participant.findById(participantId);
        if (!participant) {
            return res.status(404).json({ success: false, error: 'Participant not found' });
        }

        let imageUrl = null;
        let fileName = null;

        // Handle file upload if exists
        if (req.files && req.files.poster) {
            const file = req.files.poster;
            fileName = Date.now() + '-' + file.name;
            const savePath = path.join(__dirname, '..', 'public', 'uploads', 'posters', fileName);

            await file.mv(savePath, (err) => {
                if (err) {
                    console.error('Error saving file:', err);
                }
            });

            imageUrl = '/uploads/posters/' + fileName;
        }

        const poster = new Poster({
            participantId: participantId,
            participantName: participant.name,
            imageUrl: imageUrl,
            fileName: fileName,
            canvaLink: canvaLink || ''
        });

        await poster.save();
        res.json({ success: true, poster });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Like a poster
router.post('/api/like/:posterId', async (req, res) => {
    try {
        const posterId = req.params.posterId;
        const voterId = req.session.voterId;

        const poster = await Poster.findById(posterId);

        if (!poster) {
            return res.status(404).json({ success: false, error: 'Poster not found' });
        }

        // Check if already liked
        if (poster.likedBy.includes(voterId)) {
            return res.status(400).json({
                success: false,
                error: 'You have already liked this poster'
            });
        }

        // Add like
        poster.likes += 1;
        poster.likedBy.push(voterId);
        await poster.save();

        res.json({ success: true, likes: poster.likes });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Unlike a poster
router.post('/api/unlike/:posterId', async (req, res) => {
    try {
        const posterId = req.params.posterId;
        const voterId = req.session.voterId;

        const poster = await Poster.findById(posterId);

        if (!poster) {
            return res.status(404).json({ success: false, error: 'Poster not found' });
        }

        // Check if liked
        const likedIndex = poster.likedBy.indexOf(voterId);
        if (likedIndex === -1) {
            return res.status(400).json({
                success: false,
                error: 'You have not liked this poster'
            });
        }

        // Remove like
        poster.likes -= 1;
        poster.likedBy.splice(likedIndex, 1);
        await poster.save();

        res.json({ success: true, likes: poster.likes });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get leaderboard
router.get('/api/leaderboard', async (req, res) => {
    try {
        const posters = await Poster.find()
            .populate('participantId')
            .sort({ likes: -1 })
            .limit(10);
        res.json(posters);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete poster (admin)
router.delete('/api/posters/:id', async (req, res) => {
    try {
        await Poster.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;