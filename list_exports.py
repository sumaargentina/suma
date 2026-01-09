import re

with open(r'c:\Users\peroz\OneDrive\Escritorio\suma - argentina\src\lib\supabaseService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

matches = re.findall(r'export const (\w+)', content)
print(matches)

matches_func = re.findall(r'export function (\w+)', content)
print(matches_func)

matches_async = re.findall(r'export async function (\w+)', content)
print(matches_async)
