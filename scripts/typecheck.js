const { spawnSync } = require('child_process');

const files = [
  'src/app.js',
  'src/guest-form.js',
  'src/admin.js',
  'api/guest-entry.js',
  'api/admin-submissions.js',
  'scripts/build.js',
  'scripts/lint.js',
  'scripts/typecheck.js'
];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
}

console.log('JavaScript syntax checks passed');
