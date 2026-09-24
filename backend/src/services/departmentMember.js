const pool = require("../db/pool");

// Add officer/lawyer to department
async function addDepartmentMember({
  departmentId,
  userId,
  departmentRole,
}) {
  const departmentResult = await pool.query(
    `
    SELECT id, status
    FROM departments
    WHERE id = $1
    `,
    [departmentId]
  );

  const department = departmentResult.rows[0];

  if (!department) {
    throw new Error("DEPARTMENT_NOT_FOUND");
  }

  if (department.status !== "ACTIVE") {
    throw new Error("DEPARTMENT_INACTIVE");
  }

  const userResult = await pool.query(
    `
    SELECT id, role, is_active
    FROM users
    WHERE id = $1
    `,
    [userId]
  );

  const user = userResult.rows[0];

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (!user.is_active) {
    throw new Error("USER_INACTIVE");
  }

  if (!["officer", "lawyer"].includes(user.role)) {
    throw new Error("INVALID_MEMBER_ROLE");
  }

  if (
    departmentRole !== "department_admin" &&
    departmentRole !== user.role
  ) {
    throw new Error("ROLE_MISMATCH");
  }

  const result = await pool.query(
    `
    INSERT INTO department_members (
      department_id,
      user_id,
      department_role
    )
    VALUES ($1, $2, $3)
    RETURNING *
    `,
    [departmentId, userId, departmentRole]
  );

  return result.rows[0];
}

// Get all members of a department
async function getDepartmentMembers(departmentId) {
  const result = await pool.query(
    `
    SELECT
      dm.id,
      dm.department_id,
      dm.user_id,
      dm.department_role,
      dm.status,
      dm.joined_at,
      dm.deactivated_at,
      u.username,
      u.email,
      u.full_name,
      u.official_id,
      u.role AS system_role,
      u.is_active AS user_active
    FROM department_members dm
    JOIN users u
      ON u.id = dm.user_id
    WHERE dm.department_id = $1
    ORDER BY dm.joined_at DESC
    `,
    [departmentId]
  );

  return result.rows;
}

// Change department member role
async function updateDepartmentMemberRole(
  memberId,
  departmentRole
) {
  const memberResult = await pool.query(
    `
    SELECT
      dm.id,
      u.role
    FROM department_members dm
    JOIN users u
      ON u.id = dm.user_id
    WHERE dm.id = $1
    `,
    [memberId]
  );

  const member = memberResult.rows[0];

  if (!member) {
    throw new Error("MEMBER_NOT_FOUND");
  }

  if (
    departmentRole !== "department_admin" &&
    departmentRole !== member.role
  ) {
    throw new Error("ROLE_MISMATCH");
  }

  const result = await pool.query(
    `
    UPDATE department_members
    SET department_role = $1
    WHERE id = $2
    RETURNING *
    `,
    [departmentRole, memberId]
  );

  return result.rows[0];
}

// Activate/deactivate department member
async function updateDepartmentMemberStatus(
  memberId,
  status
) {
  const memberResult = await pool.query(
    `
    SELECT id
    FROM department_members
    WHERE id = $1
    `,
    [memberId]
  );

  const member = memberResult.rows[0];

  if (!member) {
    throw new Error("MEMBER_NOT_FOUND");
  }

  const result = await pool.query(
    `
    UPDATE department_members
    SET
      status = $1,
      deactivated_at =
        CASE
          WHEN $1 = 'DEACTIVATED' THEN now()
          ELSE NULL
        END
    WHERE id = $2
    RETURNING *
    `,
    [status, memberId]
  );

  return result.rows[0];
}

// Remove member from department
async function removeDepartmentMember(memberId) {
  const result = await pool.query(
    `
    DELETE FROM department_members
    WHERE id = $1
    RETURNING *
    `,
    [memberId]
  );

  return result.rows[0];
}

module.exports = {
  addDepartmentMember,
  getDepartmentMembers,
  updateDepartmentMemberRole,
  updateDepartmentMemberStatus,
  removeDepartmentMember,
};