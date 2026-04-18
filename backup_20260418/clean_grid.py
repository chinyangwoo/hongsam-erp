import re

with open('hr.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace the personnel-grid contents with an empty grid.
# Find <div class="personnel-grid"> and everything up to the next outer closing div or next section.
# Actually we can just define the exact region.
pattern = re.compile(r'(<div class="personnel-grid">).*?(<div class="table-container")', re.DOTALL)
replacement = r'\1\n                </div>\n\n                \2'

new_text, count = pattern.subn(replacement, text)

print(f"Replaced grid: {count} matches")

with open('hr.html', 'w', encoding='utf-8', newline='\n') as f:
    f.write(new_text)

print("Grid cleaned.")
