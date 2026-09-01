const fs = require('fs');
const https = require('https');
const iconMap = {
  Credited: 'hand-holding-dollar',
  Food: 'burger',
  Transport: 'car',
  Bills: 'file-invoice',
  Shopping: 'bag-shopping',
  Entertainment: 'film',
  Education: 'book',
  Health: 'hospital',
  Travel: 'plane',
  'Personal Care': 'pump-soap',
  Transfers: 'arrow-right-arrow-left',
  Subscriptions: 'repeat',
  Other: 'box'
};
const getSvg = (icon) => new Promise((resolve) => {
  https.get('https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/' + icon + '.svg', res => {
    let d = '';
    res.on('data', chunk => d += chunk);
    res.on('end', () => resolve(d));
  });
});

(async () => {
  let file = fs.readFileSync('categories.js', 'utf8');
  for (let [cat, icon] of Object.entries(iconMap)) {
    let svg = await getSvg(icon);
    let pathMatches = svg.match(/<path d="([^"]+)"/g);
    let paths = pathMatches ? pathMatches.map(p => p.match(/d="([^"]+)"/)[1]).map(p => `<path d="${p}" />`).join('') : '';
    let viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
    let viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 512 512';
    
    let fullSvg = `<svg viewBox="${viewBox}" fill="currentColor" style={{ width: '1em', height: '1em', verticalAlign: '-0.125em' }}>${paths}</svg>`;
    
    // We need to replace the emoji string.
    // e.g. Credited:     { emoji: '↓', label: 'Credited'  }
    let regex = new RegExp(`(${cat}:\\s*\\{\\s*emoji:\\s*)['"\`].*?['"\`]`);
    file = file.replace(regex, `$1(${fullSvg})`);
  }
  
  // also add React import if needed, but since it's JS, JSX needs React? 
  // Wait, if it's returning JSX we need to make sure the build handles it. Vite uses automatic JSX runtime so we don't need React import.
  
  fs.writeFileSync('categories.js', file);
  console.log('Categories updated!');
})();
