import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

export interface UserEntity {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: 'user' | 'admin';
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class UserRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    const query = `SELECT * FROM users WHERE LOWER(email) = LOWER($1);`;
    const res = await this.db.query<UserEntity>(query, [email]);
    return res.rows[0] || null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const query = `SELECT * FROM users WHERE id = $1;`;
    const res = await this.db.query<UserEntity>(query, [id]);
    return res.rows[0] || null;
  }

  async create(user: {
    id: string;
    email: string;
    password_hash: string;
    name: string;
    role: 'user' | 'admin';
  }): Promise<UserEntity> {
    const query = `
      INSERT INTO users (id, email, password_hash, name, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const res = await this.db.query<UserEntity>(query, [
      user.id,
      user.email.toLowerCase(),
      user.password_hash,
      user.name,
      user.role,
    ]);
    return res.rows[0];
  }

  async count(): Promise<number> {
    const res = await this.db.query<{ count: string }>('SELECT COUNT(*)::text as count FROM users;');
    return parseInt(res.rows[0].count, 10);
  }
}

