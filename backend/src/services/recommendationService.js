const mongoose = require("mongoose");

const Program = require("../models/Program");
const Student = require("../models/Student");
const HttpError = require("../utils/httpError");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildFieldMatchExpression(fields) {
  const expressions = fields.map((field) => ({
    $regexMatch: {
      input: { $toLower: "$field" },
      regex: escapeRegex(field.toLowerCase()),
    },
  }));

  if (expressions.length === 0) {
    return false;
  }

  if (expressions.length === 1) {
    return expressions[0];
  }

  return { $or: expressions };
}

async function buildProgramRecommendations(studentId) {
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw new HttpError(400, "Invalid student id.");
  }

  const student = await Student.findById(studentId).select("-password").lean();

  if (!student) {
    throw new HttpError(404, "Student not found.");
  }

  const targetCountries = student.targetCountries || [];
  const interestedFields = student.interestedFields || [];
  const preferredIntake = student.preferredIntake || "";
  const maxBudgetUsd = student.maxBudgetUsd || 0;
  const englishScore = student.englishTest?.score || 0;

  const recommendations = await Program.aggregate([
    {
      $lookup: {
        from: "universities",
        localField: "university",
        foreignField: "_id",
        as: "university",
      },
    },
    { $unwind: "$university" },
    {
      $addFields: {
        countryMatch: { $in: ["$country", targetCountries] },
        fieldMatch: buildFieldMatchExpression(interestedFields),
        budgetMatch: {
          $cond: [{ $gt: [maxBudgetUsd, 0] }, { $lte: ["$tuitionFeeUsd", maxBudgetUsd] }, false],
        },
        intakeMatch: { $in: [preferredIntake, "$intakes"] },
        ieltsMatch: { $lte: ["$minimumIelts", englishScore] },
      },
    },
    {
      $addFields: {
        score: {
          $add: [
            { $cond: ["$countryMatch", 40, 0] },
            { $cond: ["$fieldMatch", 25, 0] },
            { $cond: ["$budgetMatch", 20, 0] },
            { $cond: ["$intakeMatch", 10, 0] },
            { $cond: ["$ieltsMatch", 15, 0] },
          ],
        },
        explanationParts: [
          { $cond: ["$countryMatch", "preferred country", null] },
          { $cond: ["$fieldMatch", "field of interest", null] },
          { $cond: ["$budgetMatch", "budget range", null] },
          { $cond: ["$intakeMatch", "preferred intake", null] },
          { $cond: ["$ieltsMatch", "IELTS score", null] },
        ],
      },
    },
    { $match: { score: { $gt: 0 } } },
    { $sort: { score: -1, tuitionFeeUsd: 1 } },
    { $limit: 5 },
    {
      $project: {
        _id: 0,
        score: 1,
        explanationParts: {
          $filter: {
            input: "$explanationParts",
            as: "part",
            cond: { $ne: ["$$part", null] },
          },
        },
        program: {
          id: "$_id",
          title: "$title",
          field: "$field",
          degreeLevel: "$degreeLevel",
          tuitionFeeUsd: "$tuitionFeeUsd",
          intakes: "$intakes",
          minimumIelts: "$minimumIelts",
          scholarshipAvailable: "$scholarshipAvailable",
        },
        university: {
          id: "$university._id",
          name: "$university.name",
          country: "$university.country",
          city: "$university.city",
          qsRanking: "$university.qsRanking",
        },
      },
    },
  ]);

  return {
    data: {
      student: {
        id: student._id,
        fullName: student.fullName,
        targetCountries,
        interestedFields,
        preferredIntake,
        maxBudgetUsd,
        englishTest: student.englishTest,
      },
      recommendations: recommendations.map((recommendation) => ({
        program: recommendation.program,
        university: recommendation.university,
        score: recommendation.score,
        explanation: `Matches ${recommendation.explanationParts.join(", ")}.`,
      })),
    },
  };
}

module.exports = {
  buildProgramRecommendations,
};
