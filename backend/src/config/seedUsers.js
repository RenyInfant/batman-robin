const bcrypt = require('bcryptjs');
const db = require('./db');

async function seedDefaultUsers() {
  try {
    // ---------- ADMIN ----------
    const admin = await db.get(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );

    if (!admin) {
      const adminPassword = bcrypt.hashSync('batman2026', 10);

      await db.run(
        `
        INSERT INTO users
        (username, password_hash, role)
        VALUES (?, ?, ?)
        `,
        ['reny', adminPassword, 'admin']
      );

      console.log('✅ Default Admin created');
    }

    // ---------- JUDGE ----------
    const judge = await db.get(
      "SELECT id FROM users WHERE role = 'judge' LIMIT 1"
    );

    if (!judge) {
      const judgePassword = bcrypt.hashSync('batman2026', 10);

      await db.run(
        `
        INSERT INTO users
        (username, password_hash, role)
        VALUES (?, ?, ?)
        `,
        ['agentvatsava', judgePassword, 'judge']
      );

      console.log('✅ Default Judge created');
    }

  } catch (err) {
    console.error('❌ Error creating default users:', err.message);
  }
}

module.exports = seedDefaultUsers;
