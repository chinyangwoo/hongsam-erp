import glob, re

for f in glob.glob("*.html"):
    with open(f, 'r') as file:
        content = file.read()
    
    # Simple regex replacing href="#" with proper hrefs by looking ahead to the icon class or text
    content = re.sub(r'href=".*?"([^>]*>)\s*<i class="fa-solid fa-chart-pie">', r'href="index.html"\1\n                <i class="fa-solid fa-chart-pie">', content)
    content = re.sub(r'href=".*?"([^>]*>)\s*<i class="fa-solid fa-users">', r'href="hr.html"\1\n                <i class="fa-solid fa-users">', content)
    content = re.sub(r'href=".*?"([^>]*>)\s*<i class="fa-regular fa-calendar-check">', r'href="sales.html"\1\n                <i class="fa-regular fa-calendar-check">', content)
    content = re.sub(r'href=".*?"([^>]*>)\s*<i class="fa-solid fa-box-open">', r'href="inventory.html"\1\n                <i class="fa-solid fa-box-open">', content)
    content = re.sub(r'href=".*?"([^>]*>)\s*<i class="fa-solid fa-video">', r'href="traffic.html"\1\n                <i class="fa-solid fa-video">', content)
    content = re.sub(r'href=".*?"([^>]*>)\s*<i class="fa-solid fa-comment-dots">', r'href="messenger.html"\1\n                <i class="fa-solid fa-comment-dots">', content)
    content = re.sub(r'href=".*?"([^>]*>)\s*<i class="fa-regular fa-folder-open">', r'href="document.html"\1\n                <i class="fa-regular fa-folder-open">', content)
    content = re.sub(r'href=".*?"([^>]*>)\s*<i class="fa-solid fa-file-signature">', r'href="approval.html"\1\n                <i class="fa-solid fa-file-signature">', content)
    content = re.sub(r'href=".*?"([^>]*>)\s*<i class="fa-regular fa-clipboard">', r'href="board.html"\1\n                <i class="fa-regular fa-clipboard">', content)

    with open(f, 'w') as file:
        file.write(content)
