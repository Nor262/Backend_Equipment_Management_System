const mariadb = require('mariadb');
const pool = mariadb.createPool({
     host: 'localhost', 
     user:'root', 
     password: 'rootpassword',
     database: 'btl_db',
     connectionLimit: 5
});

async function main() {
    let conn;
    try {
	conn = await pool.getConnection();
	const rows = await conn.query("SELECT otp FROM users WHERE email='test_v1@example.com'");
	console.log(JSON.stringify(rows[0]));
    } catch (err) {
	throw err;
    } finally {
	if (conn) conn.end();
    }
}

main().then(() => pool.end());
