const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");

const app = require("../app");
const Application = require("../models/Application");
const Program = require("../models/Program");
const Student = require("../models/Student");
const University = require("../models/University");

let mongoServer;

async function seedCatalog() {
  const university = await University.create({
    name: "University of Windsor",
    country: "Canada",
    city: "Windsor",
    partnerType: "direct",
    qsRanking: 547,
    scholarshipAvailable: true,
    popularScore: 88,
    tags: ["engineering", "analytics"],
  });

  const program = await Program.create({
    university: university._id,
    universityName: university.name,
    country: university.country,
    city: university.city,
    title: "Master of Applied Computing",
    field: "Computer Science",
    degreeLevel: "master",
    tuitionFeeUsd: 22000,
    intakes: ["September", "May"],
    durationMonths: 16,
    minimumIelts: 6.5,
    scholarshipAvailable: true,
    stem: true,
  });

  return { program, university };
}

async function registerStudent(email = "test.student@example.com") {
  const response = await request(app).post("/api/auth/register").send({
    fullName: "Test Student",
    email,
    password: "Candidate123!",
    targetCountries: ["Canada"],
    interestedFields: ["Computer Science"],
    preferredIntake: "September",
    maxBudgetUsd: 23000,
    englishTest: {
      exam: "IELTS",
      score: 7,
    },
  });

  return response.body.data;
}

async function registerCounselor(email = "test.counselor@example.com") {
  const response = await request(app).post("/api/auth/register").send({
    fullName: "Test Counselor",
    email,
    password: "Candidate123!",
    role: "counselor",
  });

  return response.body.data;
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  await Promise.all([
    Application.deleteMany({}),
    Program.deleteMany({}),
    Student.deleteMany({}),
    University.deleteMany({}),
  ]);
});

afterAll(async () => {
  await mongoose.connection.close(true);
  await mongoServer.stop({ doCleanup: true, force: true });
});

describe("Waygood API", () => {
  test("registers a student and returns a token", async () => {
    const response = await request(app).post("/api/auth/register").send({
      fullName: "Aarav Malhotra",
      email: "aarav@example.com",
      password: "Candidate123!",
      role: "student",
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeTruthy();
    expect(response.body.data.user.email).toBe("aarav@example.com");
    expect(response.body.data.user.password).toBeUndefined();
  });

  test("logs in with valid credentials", async () => {
    await registerStudent("login.student@example.com");

    const response = await request(app).post("/api/auth/login").send({
      email: "login.student@example.com",
      password: "Candidate123!",
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeTruthy();
  });

  test("rejects duplicate registration as an edge case", async () => {
    await registerStudent("duplicate@example.com");

    const response = await request(app).post("/api/auth/register").send({
      fullName: "Duplicate User",
      email: "duplicate@example.com",
      password: "Candidate123!",
    });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });

  test("returns scored program recommendations", async () => {
    await seedCatalog();
    const { user } = await registerStudent("recommend@example.com");

    const response = await request(app).get(`/api/recommendations/${user.id}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.recommendations).toHaveLength(1);
    expect(response.body.data.recommendations[0].score).toBeGreaterThan(0);
    expect(response.body.data.recommendations[0].explanation).toContain("Matches");
  });

  test("prevents duplicate applications for the same intake", async () => {
    const { program } = await seedCatalog();
    const { user, token } = await registerStudent("application@example.com");

    const firstResponse = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({
        studentId: user.id,
        programId: program._id.toString(),
        intake: "September",
      });

    const duplicateResponse = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({
        studentId: user.id,
        programId: program._id.toString(),
        intake: "September",
      });

    expect(firstResponse.status).toBe(201);
    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body.success).toBe(false);
  });

  test("blocks students from updating application status", async () => {
    const { program } = await seedCatalog();
    const { user, token } = await registerStudent("blocked@example.com");

    const application = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({
        studentId: user.id,
        programId: program._id.toString(),
        intake: "September",
      });

    const response = await request(app)
      .patch(`/api/applications/${application.body.data._id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "reviewed", note: "Student trying to update." });

    expect(response.status).toBe(403);
  });

  test("allows counselors to update application status", async () => {
    const { program } = await seedCatalog();
    const { user: student, token: studentToken } = await registerStudent("counselor.test@example.com");
    const { token: counselorToken } = await registerCounselor();

    await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        studentId: student.id,
        programId: program._id.toString(),
        intake: "September",
      });

    const applications = await request(app).get("/api/applications");
    const appId = applications.body.data[0]._id;

    const response = await request(app)
      .patch(`/api/applications/${appId}/status`)
      .set("Authorization", `Bearer ${counselorToken}`)
      .send({ status: "reviewed", note: "Reviewed by counselor." });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("reviewed");
  });
});
