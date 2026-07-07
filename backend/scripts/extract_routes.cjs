const fs = require('fs');
const path = require('path');

const serverFile = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
const baseRoutes = {};

const importRegex = /import\s+(\w+)\s+from\s+'\.\/routes\/([^']+)'/g;
let importMatch;
const routeVars = {};
while ((importMatch = importRegex.exec(serverFile)) !== null) {
  routeVars[importMatch[1]] = importMatch[2]; // e.g. authRoutes -> authRoutes.js
}

const appUseRegex = /app\.use\('([^']+)',\s*(\w+)\);/g;
let useMatch;
while ((useMatch = appUseRegex.exec(serverFile)) !== null) {
  const basePath = useMatch[1];
  const varName = useMatch[2];
  if (routeVars[varName]) {
    baseRoutes[routeVars[varName]] = basePath;
  }
}

const routesDir = path.join(__dirname, '../routes');
const files = fs.readdirSync(routesDir);

const allRoutes = {};

files.forEach(file => {
  if (file.endsWith('.js')) {
    const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
    const routeRegex = /router\.(get|post|put|delete|patch)\('([^']+)'/g;
    let rMatch;
    const endpoints = [];
    while ((rMatch = routeRegex.exec(content)) !== null) {
        endpoints.push({ method: rMatch[1].toUpperCase(), path: rMatch[2] });
    }
    
    let base = baseRoutes[file] || `/${file.replace('.js', '')}`;
    allRoutes[file] = { base, endpoints };
    
    // Check if any route was reused
    if (file === 'hotelRoutes.js') {
        allRoutes['hotelRoutes.js_partner'] = { base: '/api/partners', endpoints };
    }
  }
});

let output = '# API Routes List\n\n';
for (const [file, data] of Object.entries(allRoutes)) {
  output += `## ${file} (Base Path: \`${data.base}\`)\n`;
  data.endpoints.forEach(ep => {
    let fullPath = data.base + (ep.path === '/' ? '' : ep.path);
    output += `- **${ep.method}** \`${fullPath}\`\n`;
  });
  output += '\n';
}

fs.writeFileSync(path.join(__dirname, '../all_routes.md'), output);
console.log('Routes extracted successfully to all_routes.md');
