const { execSync } = require('child_process');

try {
  console.log('Running specific test files...');
  
  // Test the fixed files
  const testFiles = [
    'src/services/__tests__/historicalDataService.test.ts',
    'src/components/__tests__/PositionModifyDialog.test.tsx',
    'src/components/__tests__/PositionControls.test.tsx'
  ];
  
  testFiles.forEach(file => {
    try {
      console.log(`\n=== Testing ${file} ===`);
      execSync(`npx jest ${file} --verbose`, { stdio: 'inherit' });
      console.log(`✅ ${file} passed`);
    } catch (error) {
      console.log(`❌ ${file} failed`);
      console.log(error.stdout?.toString() || error.message);
    }
  });
  
} catch (error) {
  console.error('Test runner failed:', error.message);
}