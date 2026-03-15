#!/usr/bin/env node
const { spawnSync } = require('child_process');
const real7za = process.argv[2]; // first arg is path to real 7za
const args = process.argv.slice(3);
const result = spawnSync(real7za, args, { stdio: 'inherit', shell: false });
// 7-Zip exit code 2 = warnings (e.g. can't create symlinks) — treat as success
process.exit(result.status === 2 ? 0 : (result.status || 0));
