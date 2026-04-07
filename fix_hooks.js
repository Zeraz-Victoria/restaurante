const fs = require('fs');
const glob = require('glob'); // npm install glob if needed
// Actually let's just do it with standard fs
const path = require('path');
const hooksDir = path.join(__dirname, 'src', 'hooks');

const files = fs.readdirSync(hooksDir).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

for (const f of files) {
    const fullPath = path.join(hooksDir, f);
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Instead of doing complicated regex, let's just comment out realtime logic safely
    
    content = content.replace(/const channelName =.*?\n.*?supabase\n.*?\.channel[\s\S]*?\.subscribe\(\);/g, `
        // Polling replacement for Realtime
        const intervalId = setInterval(() => {
            if (typeof fetchOrders !== 'undefined') fetchOrders();
            if (typeof fetchData !== 'undefined') fetchData();
            if (typeof fetchTables !== 'undefined') fetchTables();
        }, 5000);
    `);
    
    content = content.replace(/supabase\.removeChannel\(.*?\);/g, 'clearInterval(intervalId);');
    
    // Convert supabase.from to fetch API logic? That's too complex for regex.
    // It's better to just leave supabase.from intact and make a very good SupabaseMock!
    fs.writeFileSync(fullPath, content);
}
console.log("Hooks patched for polling.");
