const applicationStatuses = ["applied", "reviewed", "accepted", "rejected"];

const validStatusTransitions = {
  applied: ["reviewed"],
  reviewed: ["accepted", "rejected"],
  accepted: [],
  rejected: [],
};

module.exports = {
  applicationStatuses,
  validStatusTransitions,
};
