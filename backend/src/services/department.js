const pool = require("../db/pool");

async function createDepartment({
  departmentName,
  departmentCode,
  description,
  createdBy,
}) {
  const result = await pool.query(
    `
    INSERT INTO departments (
      department_name,
      department_code,
      description,
      created_by
    )
    VALUES ($1, $2, $3, $4)
    RETURNING *
    `,
    [departmentName, departmentCode, description || null, createdBy]
  );

  return result.rows[0];
}

async function getAllDepartments() {
  const result = await pool.query(
    `
    SELECT
      d.id,
      d.department_name,
      d.department_code,
      d.description,
      d.status,
      d.created_by,
      d.created_at,
      d.updated_at,
      COUNT(dm.id) FILTER (WHERE dm.status = 'ACTIVE') AS member_count
    FROM departments d
    LEFT JOIN department_members dm
      ON dm.department_id = d.id
    GROUP BY d.id
    ORDER BY d.created_at DESC
    `
  );

  return result.rows;
}

async function getDepartmentById(id) {
  const result = await pool.query(
    `
    SELECT
      d.id,
      d.department_name,
      d.department_code,
      d.description,
      d.status,
      d.created_by,
      d.created_at,
      d.updated_at,
      COUNT(dm.id) FILTER (WHERE dm.status = 'ACTIVE') AS member_count
    FROM departments d
    LEFT JOIN department_members dm
      ON dm.department_id = d.id
    WHERE d.id = $1
    GROUP BY d.id
    `,
    [id]
  );

  return result.rows[0];
}

async function updateDepartment(
  id,
  { departmentName, departmentCode, description }
) {
  const result = await pool.query(
    `
    UPDATE departments
    SET
      department_name = $1,
      department_code = $2,
      description = $3,
      updated_at = now()
    WHERE id = $4
    RETURNING *
    `,
    [
      departmentName,
      departmentCode,
      description || null,
      id,
    ]
  );

  return result.rows[0];
}

async function updateDepartmentStatus(id, status) {
  const result = await pool.query(
    `
    UPDATE departments
    SET
      status = $1,
      updated_at = now()
    WHERE id = $2
    RETURNING *
    `,
    [status, id]
  );

  return result.rows[0];
}

async function deleteDepartment(id) {
  const result = await pool.query(
    `
    DELETE FROM departments
    WHERE id = $1
    RETURNING *
    `,
    [id]
  );

  return result.rows[0];
}

module.exports = {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  updateDepartmentStatus,
  deleteDepartment,
};