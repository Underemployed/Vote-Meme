const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const multer = require('multer');

const path = require('path');
const MongoStore = require('connect-mongo');

const fs = require('fs');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT | 3000;
app.use(morgan('dev'));

// Parse incoming bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
  console.log('📁 uploads directory created');
}

// Serve uploads statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/posterVotingApp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB Error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Poster Schema
const posterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  imageUrl: { type: String, required: true },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const Poster = mongoose.model('Poster', posterSchema);

// Vote Schema
const voteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  posterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Poster', required: true },
  vote: { type: String, enum: ['like', 'dislike'], required: true },
  createdAt: { type: Date, default: Date.now }
});

voteSchema.index({ userId: 1, posterId: 1 }, { unique: true });
const Vote = mongoose.model('Vote', voteSchema);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.set('view engine', 'ejs');

// Session Configuration
app.use(session({
  secret: 'your-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: 'mongodb://localhost:27017/posterVotingApp'
  }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 hours
}));

// Multer Configuration for File Uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/login');
};

// Middleware to check admin
const isAdmin = (req, res, next) => {
  if (req.session.userId && req.session.isAdmin) {
    return next();
  }
  res.status(403).send('Access denied. Admin only.');
};

// Routes

// Home - Redirect to login or index
app.get('/', (req, res) => {
  if (req.session.userId) {
    res.redirect('/index');
  } else {
    res.redirect('/login');
  }
});

// Register Page
app.get('/register', (req, res) => {
  res.render('register', { error: null });
});

app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render('register', { error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();
    res.redirect('/login');
  } catch (error) {
    console.error(error);
    res.render('register', { error: 'Registration failed. Please try again.' });
  }
});

// Login Page
app.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/index');
  }
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.render('login', { error: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.render('login', { error: 'Invalid email or password' });
    }

    req.session.userId = user._id;
    req.session.userName = user.name;
    req.session.isAdmin = user.isAdmin;

    res.redirect('/index');
  } catch (error) {
    console.error(error);
    res.render('login', { error: 'Login failed. Please try again.' });
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Index - Voting Page
app.get('/index', isAuthenticated, async (req, res) => {
  try {
    // Get posters user hasn't voted on yet
    const votedPosterIds = await Vote.find({ userId: req.session.userId })
      .distinct('posterId');

    const posters = await Poster.find({ _id: { $nin: votedPosterIds } })
      .sort({ createdAt: -1 });

    res.render('index', {
      userName: req.session.userName,
      posters,
      currentIndex: 0
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading posters');
  }
});

// Vote API
app.post('/api/vote', isAuthenticated, async (req, res) => {
  try {
    const { posterId, vote } = req.body;

    // Check if already voted
    const existingVote = await Vote.findOne({
      userId: req.session.userId,
      posterId
    });

    if (existingVote) {
      return res.json({ success: false, message: 'Already voted on this poster' });
    }

    // Create vote
    await Vote.create({
      userId: req.session.userId,
      posterId,
      vote
    });

    // Update poster counts
    const updateField = vote === 'like' ? 'likes' : 'dislikes';
    await Poster.findByIdAndUpdate(posterId, { $inc: { [updateField]: 1 } });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: 'Error recording vote' });
  }
});

// Add Post Page (Admin Only)
app.get('/add-post', isAdmin, async (req, res) => {
  try {
    // Get unique names from posters
    const names = await Poster.distinct('name');
    res.render('add-post', { error: null, success: null, names });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading page');
  }
});

app.post('/add-post', isAdmin, upload.single('posterImage'), async (req, res) => {
  try {
    const { name } = req.body;

    if (!req.file) {
      const names = await Poster.distinct('name');
      return res.render('add-post', {
        error: 'Please select an image',
        success: null,
        names
      });
    }

    const poster = new Poster({
      name,
      imageUrl: '/uploads/' + req.file.filename
    });

    await poster.save();

    const names = await Poster.distinct('name');
    res.render('add-post', {
      error: null,
      success: 'Poster added successfully!',
      names
    });
  } catch (error) {
    console.error(error);
    const names = await Poster.distinct('name');
    res.render('add-post', {
      error: 'Error adding poster',
      success: null,
      names
    });
  }
});

// Leaderboard Page (Admin Only)
app.get('/leaderboard', isAdmin, async (req, res) => {
  try {
    // Get all unique names and their total likes
    const leaderboard = await Poster.aggregate([
      {
        $group: {
          _id: '$name',
          totalLikes: { $sum: '$likes' },
          totalDislikes: { $sum: '$dislikes' },
          posters: {
            $push: {
              id: '$_id',
              imageUrl: '$imageUrl',
              likes: '$likes',
              dislikes: '$dislikes'
            }
          }
        }
      },
      { $sort: { totalLikes: -1 } }
    ]);

    res.render('leaderboard', { leaderboard });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading leaderboard');
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});