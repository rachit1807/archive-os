import pg from 'pg';
export const pool=process.env.DATABASE_URL?new pg.Pool({connectionString:process.env.DATABASE_URL,max:3,connectionTimeoutMillis:15000,idleTimeoutMillis:20000}):null;
let ready;
export function initialize(){return ready??=pool.query(`CREATE TABLE IF NOT EXISTS archive_accounts(id uuid PRIMARY KEY,email text UNIQUE NOT NULL,password text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()); CREATE TABLE IF NOT EXISTS archive_sessions(token text PRIMARY KEY,user_id uuid NOT NULL REFERENCES archive_accounts(id),expires_at timestamptz NOT NULL); CREATE TABLE IF NOT EXISTS archive_vaults(user_id uuid PRIMARY KEY REFERENCES archive_accounts(id),document jsonb NOT NULL);`).catch(e=>{ready=null;throw e;});}
export class PostgresStore {
 constructor(userId){this.userId=userId;}
 async read(){await initialize();const r=await pool.query('SELECT document FROM archive_vaults WHERE user_id=$1',[this.userId]);return r.rows[0]?.document||{version:1,items:[]};}
 async transact(fn){await initialize();const client=await pool.connect();try{await client.query('BEGIN');await client.query('INSERT INTO archive_vaults(user_id,document) VALUES($1,$2) ON CONFLICT DO NOTHING',[this.userId,{version:1,items:[]}]);const r=await client.query('SELECT document FROM archive_vaults WHERE user_id=$1 FOR UPDATE',[this.userId]);const d=r.rows[0].document;const result=await fn(d);await client.query('UPDATE archive_vaults SET document=$2 WHERE user_id=$1',[this.userId,d]);await client.query('COMMIT');return result;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}
}
