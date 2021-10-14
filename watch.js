const fs = require('fs');
const dir = './dist';

console.log(`Watching for file changes on ${dir}`);

fs.watch(dir, (event, filename) => {
  if (filename) say.speak('d')
});