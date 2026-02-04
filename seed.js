const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB using your existing connection
const url = process.env.url || "mongodb://localhost:27017/event-management";

mongoose.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Schemas
const participantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    department: String,
    year: String,
    timestamp: { type: Date, default: Date.now }
});

const Participant = mongoose.model('Participant', participantSchema);

// Initial participants data from your CSV
const participantsData = [
    {
        name: 'MADHAV KRISHNA M',
        email: 'madhavkrishnaofficial.in@gmail.com',
        phone: '8848327003',
        department: 'CE',
        year: '1st Year'
    },
    {
        name: 'Neelaj S',
        email: 'neelajsanthosh@gmail.com',
        phone: '7012690272',
        department: 'ECE',
        year: '1st Year'
    },
    {
        name: 'B S Ananthasree',
        email: 'bsananthasree@gmail.com',
        phone: '9400876790',
        department: 'CE',
        year: '1st Year'
    },
    {
        name: 'Abhiram A',
        email: 'ulloor.abhiram@gmail.com',
        phone: '9995933057',
        department: 'IT',
        year: '1st Year'
    },
    {
        name: 'Sreshta M S',
        email: 'mssreshta@gmail.com',
        phone: '7012745242',
        department: 'CE',
        year: '2nd Year'
    }
];

async function seedDatabase() {
    try {
        // Clear existing participants
        await Participant.deleteMany({});
        console.log('Cleared existing participants');

        // Insert new participants
        const result = await Participant.insertMany(participantsData);
        console.log(`✅ Successfully added ${result.length} participants to the database`);

        // Display added participants
        result.forEach(p => {
            console.log(`   - ${p.name} (${p.department} - ${p.year})`);
        });

        mongoose.connection.close();
    } catch (err) {
        console.error('Error seeding database:', err);
        mongoose.connection.close();
    }
}

seedDatabase();