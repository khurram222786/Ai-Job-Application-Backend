require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./config/sequelize');
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const applicationRoutes = require('./routes/userRoutes')

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});


app.use('/api/admin', adminRoutes);
app.use('/api/user/', applicationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Job Portal API' });
});

sequelize.sync()
  .then(() => {
    console.log('Database synced');
    app.listen(process.env.PORT || 3000, () => {
      console.log(`Server running on port ${process.env.PORT || 3000}`);
    });
  })
  .catch(err => console.error('Unable to sync database:', err));