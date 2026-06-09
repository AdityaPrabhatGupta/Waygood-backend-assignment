const { validStatusTransitions } = require("../config/constants");
const Application = require("../models/Application");
const Program = require("../models/Program");
const Student = require("../models/Student");
const cacheService = require("../services/cacheService");
const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/httpError");

const listApplications = asyncHandler(async (req, res) => {
  const { studentId, status } = req.query;
  const filters = {};

  if (studentId) {
    filters.student = studentId;
  }

  if (status) {
    filters.status = status;
  }

  const applications = await Application.find(filters)
    .populate("student", "fullName email role")
    .populate("program", "title degreeLevel tuitionFeeUsd")
    .populate("university", "name country city")
    .populate("timeline.changedBy", "fullName email role")
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    data: applications,
  });
});

const createApplication = asyncHandler(async (req, res) => {
  const { studentId, programId, intake } = req.body;

  if (!studentId || !programId || !intake) {
    throw new HttpError(400, "Student, program and intake are required.");
  }

  const [student, program] = await Promise.all([
    Student.findById(studentId).select("_id").lean(),
    Program.findById(programId).lean(),
  ]);

  if (!student) {
    throw new HttpError(404, "Student not found.");
  }

  if (!program) {
    throw new HttpError(404, "Program not found.");
  }

  if (!program.intakes.includes(intake)) {
    throw new HttpError(400, "Selected intake is not available for this program.");
  }

  const duplicate = await Application.findOne({
    student: studentId,
    program: programId,
    intake,
  }).lean();

  if (duplicate) {
    throw new HttpError(409, "Application already exists for this student, program and intake.");
  }

  const application = await Application.create({
    student: studentId,
    program: programId,
    university: program.university,
    destinationCountry: program.country,
    intake,
    status: "applied",
    timeline: [
      {
        status: "applied",
        note: "Application created.",
        changedBy: req.user._id,
      },
    ],
  });

  cacheService.delete("dashboard-overview");

  const populatedApplication = await Application.findById(application._id)
    .populate("student", "fullName email role")
    .populate("program", "title degreeLevel tuitionFeeUsd")
    .populate("university", "name country city")
    .populate("timeline.changedBy", "fullName email role")
    .lean();

  res.status(201).json({
    success: true,
    data: populatedApplication,
  });
});

const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { status, note = "" } = req.body;

  if (!status) {
    throw new HttpError(400, "Status is required.");
  }

  const application = await Application.findById(req.params.id);

  if (!application) {
    throw new HttpError(404, "Application not found.");
  }

  const allowedNextStatuses = validStatusTransitions[application.status] || [];

  if (!allowedNextStatuses.includes(status)) {
    throw new HttpError(
      400,
      `Invalid status transition from ${application.status} to ${status}.`
    );
  }

  application.status = status;
  application.timeline.push({
    status,
    note,
    changedBy: req.user._id,
  });

  await application.save();
  cacheService.delete("dashboard-overview");

  const updatedApplication = await Application.findById(application._id)
    .populate("student", "fullName email role")
    .populate("program", "title degreeLevel tuitionFeeUsd")
    .populate("university", "name country city")
    .populate("timeline.changedBy", "fullName email role")
    .lean();

  res.json({
    success: true,
    data: updatedApplication,
  });
});

module.exports = {
  createApplication,
  listApplications,
  updateApplicationStatus,
};
