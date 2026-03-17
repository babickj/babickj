const sql = require('mssql');

// Configuration to connect to the ISATTactical.mdf database.
// The .mdf file must be attached to a running SQL Server instance,
// or you can use LocalDB / SQL Server Express with AttachDbFilename.
const config = {
  server: 'localhost',          // SQL Server host (change if remote)
  database: 'ISATTactical',     // Logical database name once attached
  options: {
    // Use this if the DB is not already attached to SQL Server and you want
    // to attach the .mdf file directly via LocalDB or SQL Server Express:
    // attachDbFilename: 'C:\\ISAT\\Databases\\ISATTactical.mdf',

    trustServerCertificate: true, // Required for self-signed certs (dev/local)
    encrypt: false,               // Set to true for Azure SQL
  },
  authentication: {
    type: 'default',             // Windows auth: change to 'ntlm' or use 'integrated'
    options: {
      userName: '',              // Leave empty for Windows Integrated Auth
      password: '',              // Leave empty for Windows Integrated Auth
    },
  },
};

// Alternatively, use a connection string with AttachDbFilename for LocalDB:
// const connectionString =
//   'Server=(localdb)\\MSSQLLocalDB;' +
//   'AttachDbFilename=C:\\ISAT\\Databases\\ISATTactical.mdf;' +
//   'Database=ISATTactical;' +
//   'Trusted_Connection=Yes;';

async function connectToISATDatabase() {
  let pool;
  try {
    console.log('Connecting to ISATTactical database...');
    pool = await sql.connect(config);
    console.log('Connected successfully.');

    // Example query — replace with your actual table/query
    const result = await pool.request().query('SELECT TOP 10 * FROM INFORMATION_SCHEMA.TABLES');
    console.log('Tables in ISATTactical:');
    console.table(result.recordset);

    return result.recordset;
  } catch (err) {
    console.error('Database connection failed:', err.message);
    throw err;
  } finally {
    if (pool) {
      await pool.close();
      console.log('Connection closed.');
    }
  }
}

connectToISATDatabase();
