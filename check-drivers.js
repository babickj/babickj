const odbc = require('odbc');

// List all ODBC drivers installed on this machine
async function checkDrivers() {
  try {
    const drivers = await odbc.drivers();
    console.log('Installed ODBC drivers:\n');
    drivers.forEach((d, i) => console.log(`  ${i}. ${d}`));

    const accessDrivers = drivers.filter(d => /access/i.test(d));
    if (accessDrivers.length > 0) {
      console.log('\nAccess-compatible drivers found:');
      accessDrivers.forEach(d => console.log(`  -> ${d}`));
      console.log('\nUse one of the above in your connection string:');
      console.log(`  Driver={${accessDrivers[0]}};DBQ=C:\\ISAT\\Databases\\ISATTactical.mdb;`);
    } else {
      console.log('\nNo Access ODBC driver found.');
      console.log('Install the Microsoft Access Database Engine:');
      console.log('  https://www.microsoft.com/en-us/download/details.aspx?id=54920');
      console.log('\nIMPORTANT: Driver bitness must match Node.js bitness.');
      console.log('  Node.js arch:', process.arch);
    }
  } catch (err) {
    console.error('Failed to list drivers:', err.message);
  }
}

checkDrivers();
