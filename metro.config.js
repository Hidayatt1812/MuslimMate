const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Supabase dan beberapa package lain menyertakan file ESM (.mjs) yang tidak
// bisa di-resolve oleh Metro. Matikan 'package exports' agar Metro menggunakan
// field "main" (CJS) alih-alih "exports" yang mengarah ke .mjs.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
