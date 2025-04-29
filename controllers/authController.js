const bcrypt = require("bcrypt");
const userRepository = require("../repositories/userRepository");
const CustomError = require("../Utils/customError");
const asyncErrorHandler = require("../Utils/asyncErrorHandler");
const { generateToken } = require("../config/jwt");

const createAuthResponse = (user, role) => {
  return {
    token: generateToken(user.user_id),
    user_id: user.user_id,
    username: user.username,
    email: user.email,
    role
  };
};

exports.registerUser = asyncErrorHandler(async (req, res, next) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password || !role) {
    return next(new CustomError("All fields are required", 400));
  }

  if (await userRepository.userExists(email)) {
    return next(new CustomError("User already exists", 400));
  }
  const userType = await userRepository.findUserTypeByRole(role);
  if (!userType) {
    return next(new CustomError("Invalid role", 400));
  }

  const newUser = await userRepository.createUser({
    username,
    email,
    password,
    user_type_id: userType.id,
  });

  const responseData = createAuthResponse(newUser, userType.role);
  res.success(responseData, "User registered successfully", 201);
});

exports.loginUser = asyncErrorHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new CustomError("Please provide email and password", 400));
  }

  const user = await userRepository.findUserByEmail(email);
  if (!user || !(await user.validPassword(password))) {
    return next(new CustomError("Invalid credentials", 401));
  }

  const responseData = createAuthResponse(user, user.UserType.role);
  res.success(responseData, "Login successful");
});
