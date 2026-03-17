const odbc = require('odbc');

const connectionString =
  'Driver={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=C:\\ISAT\\Databases\\ISATTactical.mdb;';

async function listTables() {
  let conn;
  try {
    conn = await odbc.connect(connectionString);
    console.log('Connected');
    const tables = await conn.tables(null, null, null, 'TABLE');
    tables.forEach((t, i) => console.log(`${i}. ${t.TABLE_NAME}`));
  } catch (err) {
    console.error('Error:', err.message);
    throw err;
  } finally {
    if (conn) await conn.close();
  }
}

listTables();
