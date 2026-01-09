
import os

file_path = r"c:\Users\peroz\OneDrive\Escritorio\suma - argentina\src\lib\supabaseService.ts"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if "// export const getClinic =" in line:
        skip = True
    
    if "// Clinic Expenses" in line:
        skip = False
    
    if not skip:
        new_lines.append(line)

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("Fixed.")
