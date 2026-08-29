const fs = require('fs');
const c = fs.readFileSync('src/App.jsx', 'utf8');
const fixed = c.replace("setType('deposit')}\"", "setType('deposit')}");
fs.writeFileSync('src/App.jsx', fixed);
const lines = fixed.split('\n');
console.log('fixed line 679 end:', JSON.stringify(lines[678].slice(-15)));
