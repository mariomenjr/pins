import { readdir, copyFile } from 'fs/promises';
import { join } from 'path';

const distDir = 'dist/assets';
const cssFile = await readdir(distDir).then(files => 
  files.find(file => file.startsWith('index-') && file.endsWith('.css'))
);

if (cssFile) {
  await copyFile(join(distDir, cssFile), join(distDir, 'style.css'));
  console.log(`Copied ${cssFile} to style.css`);
}