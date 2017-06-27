const fs = require('fs-extra');
const path = require('path');

const templatesPath = path.resolve(__dirname, '../src/blueprints');
const distPath = path.resolve(__dirname, '../dist/blueprints');

fs.copySync(templatesPath, distPath);