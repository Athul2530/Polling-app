require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const connectDB = require('./src/config/db');

const authRoutes = require('./src/routes/auth');
const pollsRoutes = require('./src/routes/polls');

const app = express();
app.use(cors());
app.use(bodyParser.json());

connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/polls', pollsRoutes);

app.get('/', (req, res) => res.send('Polling API is running'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
