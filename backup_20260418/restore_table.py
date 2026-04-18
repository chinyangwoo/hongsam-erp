import re

with open('backup_20260417/hr.html', 'r', encoding='utf-8') as f:
    backup = f.read()

match = re.search(r'(<table class="emp-monthly-table">.*?</table>)', backup, re.DOTALL)
if match:
    table_content = match.group(1)
    with open('hr.html', 'r', encoding='utf-8') as f:
        current = f.read()
    
    current = re.sub(r'<table class="emp-monthly-table">.*?</table>', table_content, current, flags=re.DOTALL)
    
    with open('hr.html', 'w', encoding='utf-8', newline='\n') as f:
        f.write(current)
    print("Restored emp-monthly-table perfectly!")
else:
    print("Could not find the table in backup!")
