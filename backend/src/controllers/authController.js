const jwt = require("jsonwebtoken");

const env = require("../config/env");
const Student = require("../models/Student");
const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/httpError");

function buildToken(user) {
  return jwt.sign(
    {
      role: user.role,
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
      subject: user._id.toString(),
    }
  );
}

function formatUser(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    targetCountries: user.targetCountries || [],
    interestedFields: user.interestedFields || [],
    preferredIntake: user.preferredIntake || "",
    maxBudgetUsd: user.maxBudgetUsd || 0,
    englishTest: user.englishTest,
    profileComplete: user.profileComplete,
  };
}

const register = asyncHandler(async (req, res) => {
  const {
    fullName,
    email,
    password,
    role = "student",
    targetCountries = [],
    interestedFields = [],
    preferredIntake = "",
    maxBudgetUsd = 0,
    englishTest,
  } = req.body;

  if (!fullName || !email || !password) {
    throw new HttpError(400, "Full name, email and password are required.");
  }

  if (!["student", "counselor"].includes(role)) {
    throw new HttpError(400, "Role must be either student or counselor.");
  }

  const existingUser = await Student.findOne({ email: email.toLowerCase() });

  if (existingUser) {
    throw new HttpError(409, "An account with this email already exists.");
  }

  const user = await Student.create({
    fullName,
    email,
    password,
    role,
    targetCountries,
    interestedFields,
    preferredIntake,
    maxBudgetUsd,
    englishTest,
    profileComplete: role === "counselor" || Boolean(preferredIntake),
  });

  res.status(201).json({
    success: true,
    data: {
      user: formatUser(user),
      token: buildToken(user),
    },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new HttpError(400, "Email and password are required.");
  }

  const user = await Student.findOne({ email: email.toLowerCase() });

  if (!user || !(await user.comparePassword(password))) {
    throw new HttpError(401, "Invalid email or password.");
  }

  res.json({
    success: true,
    data: {
      user: formatUser(user),
      token: buildToken(user),
    },
  });
});

const me = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: formatUser(req.user),
    },
  });
});

module.exports = {
  register,
  login,
  me,
};
