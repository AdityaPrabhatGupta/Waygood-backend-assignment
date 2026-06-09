const Program = require("../models/Program");
const University = require("../models/University");
const cacheService = require("../services/cacheService");
const asyncHandler = require("../utils/asyncHandler");

function parseBoolean(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

const listUniversities = asyncHandler(async (req, res) => {
  const {
    country,
    degreeLevel,
    intake,
    budget,
    maxTuition,
    partnerType,
    q,
    search,
    scholarshipAvailable,
    sortBy = "popular",
    page = 1,
    limit = 10,
  } = req.query;

  const filters = {};

  if (country) {
    filters.country = country;
  }

  if (partnerType) {
    filters.partnerType = partnerType;
  }

  const scholarshipFlag = parseBoolean(scholarshipAvailable);
  if (typeof scholarshipFlag === "boolean") {
    filters.scholarshipAvailable = scholarshipFlag;
  }

  const searchTerm = q || search;
  if (searchTerm) {
    filters.$or = [
      { name: { $regex: searchTerm, $options: "i" } },
      { country: { $regex: searchTerm, $options: "i" } },
      { city: { $regex: searchTerm, $options: "i" } },
      { tags: { $regex: searchTerm, $options: "i" } },
    ];
  }

  const programFilters = {};

  if (country) {
    programFilters.country = country;
  }

  if (degreeLevel) {
    programFilters.degreeLevel = degreeLevel;
  }

  if (intake) {
    programFilters.intakes = intake;
  }

  const tuitionLimit = Number(budget || maxTuition);
  if (Number.isFinite(tuitionLimit) && tuitionLimit > 0) {
    programFilters.tuitionFeeUsd = { $lte: tuitionLimit };
  }

  if (Object.keys(programFilters).length > 0) {
    const matchingPrograms = await Program.find(programFilters)
      .select("university")
      .lean();
    filters._id = { $in: matchingPrograms.map((program) => program.university) };
  }

  const pageNumber = Math.max(Number(page), 1);
  const pageSize = Math.min(Math.max(Number(limit), 1), 50);

  const sortMap = {
    name: { name: 1 },
    ranking: { qsRanking: 1, popularScore: -1 },
    popular: { popularScore: -1, qsRanking: 1 },
  };

  const [items, total] = await Promise.all([
    University.find(filters)
      .sort(sortMap[sortBy] || sortMap.popular)
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    University.countDocuments(filters),
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

const listPopularUniversities = asyncHandler(async (req, res) => {
  const cacheKey = "popular-universities";
  const cachedPayload = cacheService.get(cacheKey);

  if (cachedPayload) {
    return res.json({
      success: true,
      data: cachedPayload,
      meta: {
        cache: "hit",
      },
    });
  }

  const universities = await University.find()
    .sort({ popularScore: -1, qsRanking: 1 })
    .limit(6)
    .lean();

  cacheService.set(cacheKey, universities);

  res.json({
    success: true,
    data: universities,
    meta: {
      cache: "miss",
    },
  });
});

module.exports = {
  listPopularUniversities,
  listUniversities,
};
