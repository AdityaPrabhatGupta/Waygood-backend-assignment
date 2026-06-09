const Program = require("../models/Program");
const asyncHandler = require("../utils/asyncHandler");

function parseBoolean(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

const listPrograms = asyncHandler(async (req, res) => {
  const {
    country,
    degreeLevel,
    intake,
    field,
    q,
    search,
    budget,
    maxTuition,
    maxBudget,
    ielts,
    scholarshipAvailable,
    sortBy = "relevance",
    page = 1,
    limit = 10,
  } = req.query;

  const filters = {};

  if (country) {
    filters.country = country;
  }

  if (degreeLevel) {
    filters.degreeLevel = degreeLevel;
  }

  if (field) {
    filters.field = { $regex: field, $options: "i" };
  }

  if (intake) {
    filters.intakes = intake;
  }

  const tuitionLimit = Number(budget || maxTuition || maxBudget);
  if (Number.isFinite(tuitionLimit) && tuitionLimit > 0) {
    filters.tuitionFeeUsd = { $lte: tuitionLimit };
  }

  const ieltsScore = Number(ielts);
  if (Number.isFinite(ieltsScore) && ieltsScore > 0) {
    filters.minimumIelts = { $lte: ieltsScore };
  }

  const scholarshipFlag = parseBoolean(scholarshipAvailable);
  if (typeof scholarshipFlag === "boolean") {
    filters.scholarshipAvailable = scholarshipFlag;
  }

  const searchTerm = q || search;
  if (searchTerm) {
    filters.$or = [
      { title: { $regex: searchTerm, $options: "i" } },
      { universityName: { $regex: searchTerm, $options: "i" } },
      { field: { $regex: searchTerm, $options: "i" } },
      { country: { $regex: searchTerm, $options: "i" } },
    ];
  }

  const pageNumber = Math.max(Number(page), 1);
  const pageSize = Math.min(Math.max(Number(limit), 1), 50);

  const sortMap = {
    tuitionAsc: { tuitionFeeUsd: 1 },
    tuitionDesc: { tuitionFeeUsd: -1 },
    newest: { createdAt: -1 },
    relevance: { scholarshipAvailable: -1, tuitionFeeUsd: 1 },
  };

  const [items, total] = await Promise.all([
    Program.find(filters)
      .populate("university", "name country city qsRanking scholarshipAvailable")
      .sort(sortMap[sortBy] || sortMap.relevance)
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Program.countDocuments(filters),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total,
      pages: Math.ceil(total / pageSize),
    },
  });
});

module.exports = {
  listPrograms,
};
