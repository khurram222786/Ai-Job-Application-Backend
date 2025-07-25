const setupRoutes = (app) => {
    const adminRoutes = require('../routes/adminRoutes');
    const authRoutes = require('../routes/authRoutes');
    const uploadRoutes = require('../routes/uploadRoutes');
    const userRoutes = require('../routes/userRoutes');
    const savedJobRoutes = require('../routes/savedJobRoutes');
  
    app.use('/api/admin', adminRoutes);
    app.use('/api/user/', userRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/upload', uploadRoutes);
    app.use('/api', savedJobRoutes);
    
    app.get('/', (req, res) => {
      res.json({ message: 'Welcome to Job Portal API' });
    });
  };
  
  module.exports = setupRoutes;