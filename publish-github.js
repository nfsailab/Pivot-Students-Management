const { execSync } = require('child_process');

console.log('=== Checking GitHub Authentication ===');
if (!process.env.GH_TOKEN) {
  console.error('❌ Error: The GH_TOKEN environment variable is not defined.');
  console.error('Please set it before running this script using:');
  console.error('  $env:GH_TOKEN="your_github_personal_access_token"');
  process.exit(1);
}

console.log('=== Step 1: Running Vite build ===');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Vite build completed successfully!');
} catch (err) {
  console.error('❌ Vite build failed:', err.message);
  process.exit(1);
}

console.log('\n=== Step 2: Compiling & Publishing Student Client ===');
try {
  execSync('npx electron-builder -c electron-builder-student.json --publish always', { stdio: 'inherit' });
  console.log('✅ Student Client published successfully!');
} catch (err) {
  console.error('❌ Student Client build/publish failed:', err.message);
  process.exit(1);
}

console.log('\n=== Step 3: Compiling & Publishing HOD Dashboard ===');
try {
  execSync('npx electron-builder -c electron-builder-hod.json --publish always', { stdio: 'inherit' });
  console.log('✅ HOD Dashboard published successfully!');
} catch (err) {
  console.error('❌ HOD Dashboard build/publish failed:', err.message);
  process.exit(1);
}

console.log('\n🎉 All applications built and published successfully to GitHub Releases!');
