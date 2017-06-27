/**
 * Nothing fancy just prevents
 * a full blown dependency for
 * simple process of bumping
 * semver before commit/pub.
 */

// EXAMPLES
/************************/

// node ./bin/bump -minor             (auto updates minor)
// node ./bin/bump --patch 3          (would set 0.1.3)
// node ./bin/bump -patch --major 2   (would auto patch to next and set major to 2)

const pkg = require('../package.json');
const fs = require('fs');

const argv = process.argv;
const maxPatch = 999;
const maxMinor = 99;
const maxMajor = 0;

// Get current version string.
let ver = pkg.version.split('.');
let verArr = [];

// Check for truthy value.
function isTruthy(val) {
  return val >= 0 && !isNaN(val) && val !== false
    && val !== undefined && val !== null && val !== '';
}

// Parse int with try catch.
function tryParseInt(num) {
  try {
    return parseInt(num);
  } catch (ex) {
    return false;
  }
}

// Parse the version from command line.
function parseVer(idx, set, setting) {
  var parsed = tryParseInt(idx);
  if (parsed === false || parsed < 0 || isNaN(parsed))
    return false;
  if (set)
    return parseVer(argv[parsed + 1], null, true);
  if (setting)
    return parsed;
  return true;
}

// Map for converting sting to index.
const verMap = {
  major: 0,
  minor: 1,
  patch: 2
}

// Recursive for setting version.
function setVersion(type, ver) {

  const idx = verMap[type];
  let cur = verArr[idx];
  let next = cur + 1;

  if (isTruthy(ver))
    next = ver;

  if (isTruthy(ver)) {
    verArr[idx] = ver;
  }

  else {
    if (type === 'patch') {
      if (next > maxPatch) {
        // zero current stepping
        // up to minor.
        verArr[idx] = 0;
        return setVersion('minor');
      }
      else {
        verArr[idx] = next;
      }
    }
    else if (type === 'minor') {
      if (next > maxMinor) {
        // zero current stepping
        // up to major.
        verArr[idx] = 0;
        return setVersion('major');
      }
      else {
        verArr[idx] = next;
      }
    }
    else {
      verArr[idx] = next;
    }
  }

}

// Iterate current version and parse to int.
ver.forEach((elem) => {
  verArr.push(tryParseInt(elem) || 0);
});

// Parse command line flags.
const hasMajor = parseVer(argv.indexOf('-major'));
const hasMinor = parseVer(argv.indexOf('-minor'));
const hasPatch = parseVer(argv.indexOf('-patch'));
const setMajor = parseVer(argv.indexOf('--major'), true);
const setMinor = parseVer(argv.indexOf('--minor'), true);
const setPatch = parseVer(argv.indexOf('--patch'), true);

// Update patch automatically.
if (!hasMajor && !hasMinor && !hasPatch
  && !isTruthy(setMajor) && !isTruthy(setMinor)
  && !isTruthy(setPatch)) {
  setVersion('patch');
}

// Manually set.
else {

  if (isTruthy(setPatch) || hasPatch)
    setVersion('patch', setPatch);
  if (isTruthy(setMinor) || hasMinor)
    setVersion('minor', setMinor);
  if (isTruthy(setMajor) || hasMajor)
    setVersion('major', setMajor);
}

pkg.version = verArr.join('.');

// Udpate package json with new semver.
console.log('\n' + 'Bumped semantic version to: ' + pkg.version);
fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2));




