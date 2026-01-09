
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const vars: Record<string, string> = {};

Object.keys(process.env).forEach(key => {
    if (key.includes('SUPABASE') || key.includes('KEY')) {
        vars[key] = process.env[key] ? (process.env[key]!.substring(0, 10) + '...') : 'EMPTY';
    }
});

fs.writeFileSync('scripts/env-keys.json', JSON.stringify(vars, null, 2));
console.log('Done.');
