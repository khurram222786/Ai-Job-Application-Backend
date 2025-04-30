const setupRoutes = (app) => {
    const adminRoutes = require('../routes/adminRoutes');
    const authRoutes = require('../routes/authRoutes');
    const uploadRoutes = require('../routes/uploadRoutes');
    const applicationRoutes = require('../routes/userRoutes');
  
    app.use('/api/admin', adminRoutes);
    app.use('/api/user/', applicationRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/upload', uploadRoutes);
    
    app.get('/', (req, res) => {
      res.json({ message: 'Welcome to Job Portal API' });
    });
  };
  
  module.exports = setupRoutes;