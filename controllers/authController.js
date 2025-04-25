const bcrypt = require('bcrypt');
const { User, UserType } = require('../models');
const { generateToken } = require('../config/jwt');

const registerUser = async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;

    // Validation
    if (!username || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user exists
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Get role
    const userType = await UserType.findOne({ where: { role } });
    if (!userType) {
      return res.status(400).json({ 
        message: 'Invalid role',
        validRoles: ['admin', 'user'] // Update with your actual roles
      });
    }

    // Create user (password is automatically hashed by the model hook)
    const newUser = await User.create({
      username,
      email,
      password, // Will be hashed by the beforeCreate hook
      user_type_id: userType.id
    });

    // Generate token
    const token = generateToken(newUser.user_id);

    // Don't send password back
    const userResponse = {
      user_id: newUser.user_id,
      username: newUser.username,
      email: newUser.email,
      role: userType.role
    };

    return res.status(201).json({
      user: userResponse,
      token
    });

  } catch (err) {
    console.error('Registration error:', err);
    next(err);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Find user with associated UserType
    const user = await User.findOne({
      where: { email },
      include: {
        model: UserType,
        as: 'UserType', 
        attributes: ['role']
      }
    });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Verify password using the model method
    const validPassword = await user.validPassword(password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const token = generateToken(user.user_id);
    
    res.status(200).json({
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.UserType.role,
      token,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { registerUser, loginUser };