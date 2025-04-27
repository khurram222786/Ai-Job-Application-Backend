const bcrypt = require('bcrypt');
const { User, UserType } = require('./../models');
const asyncErrorHandler = require('../Utils/asyncErrorHandler');
const CustomError = require('../Utils/customError');
const { generateToken } = require('./../config/jwt');

const createSendResponse = (user, userType, statusCode, res) => {
    const token = generateToken(user.user_id);

    const userResponse = {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role: userType.role
    };

    res.status(statusCode).json({
        status: 'success',
        token,
        user: userResponse
    });
};

exports.registerUser = asyncErrorHandler(async (req, res, next) => {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
        return next(new CustomError('All fields are required', 400));
    }

    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
        return next(new CustomError('User already exists', 400));
    }

    const userType = await UserType.findOne({ where: { role } });
    if (!userType) {
        return next(new CustomError('Invalid role', 400));
    }

    const newUser = await User.create({
        username,
        email,
        password,
        user_type_id: userType.id
    });

    createSendResponse(newUser, userType, 201, res);
});

exports.loginUser = asyncErrorHandler(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return next(new CustomError('Please provide email and password', 400));
    }

    const user = await User.findOne({
        where: { email },
        include: {
            model: UserType,
            as: 'UserType',
            attributes: ['role']
        }
    });

    if (!user || !(await user.validPassword(password))) {
        return next(new CustomError('Invalid credentials', 401));
    }

    const token = generateToken(user.user_id);

    res.status(200).json({
        status: 'success',
        token,
        user: {
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            role: user.UserType.role
        }
    });
});
