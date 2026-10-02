/**
 * Jest stand-in for CSS imports (test tooling).
 * src/constants/theme.ts imports src/global.css for web fonts, and Jest cannot parse CSS, so the
 * `moduleNameMapper` entry in package.json maps every `.css` import to this empty module.
 */
module.exports = {};
