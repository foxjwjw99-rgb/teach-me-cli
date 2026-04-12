import { generateTeachMeCliDemoCourse } from './dist/src/demo.js';
import { generatePPTX, generateJSON, generateHTML } from './dist/src/export/index.js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('🎓 Generating teach-me-cli Demo Course\n');
  
  const classroom = generateTeachMeCliDemoCourse();
  
  console.log(`✅ Course created: "${classroom.title}"`);
  console.log(`   ${classroom.scenes.length} scenes, ${Math.round(classroom.metadata.totalDuration / 60)} minutes\n`);
  
  const outputDir = `${__dirname}/output/demo`;
  
  try {
    console.log('📊 Exporting formats...\n');
    
    await generateJSON(classroom, `${outputDir}/classroom.json`);
    await generatePPTX(classroom, `${outputDir}/teach-me-cli-demo.pptx`);
    await generateHTML(classroom, `${outputDir}/index.html`);
    
    console.log('\n✅ All formats generated successfully!\n');
    console.log('📁 Output files:');
    console.log(`   • ${outputDir}/teach-me-cli-demo.pptx`);
    console.log(`   • ${outputDir}/classroom.json`);
    console.log(`   • ${outputDir}/index.html\n`);
    console.log('🌐 Open index.html in browser to view the course.');
  } catch (error) {
    console.error('❌ Generation failed:', error);
    process.exit(1);
  }
}

main();
