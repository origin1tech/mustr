const del = require('del');
const pkg = require('../package.json');

del.sync(['./dist/**/*.{ts,map,js}']);