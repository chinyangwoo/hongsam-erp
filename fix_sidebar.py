"""Sidebar fix: add board link between traffic and messenger on all pages."""
import os, re

base = os.path.dirname(os.path.abspath(__file__))
htmls = [f for f in os.listdir(base) if f.endswith('.html') and f != 'login.html']

BOARD_LINK = '            <a href="board.html" class="nav-item">\n                <i class="fa-regular fa-clipboard"></i> \uc804\uc0ac \uac8c\uc2dc\ud310</a>\n'

for fn in htmls:
    path = os.path.join(base, fn)
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    new_lines = []
    i = 0
    removed_board = False
    inserted_board = False

    while i < len(lines):
        line = lines[i]

        # Remove existing board.html link (may span 2 lines)
        if 'href="board.html"' in line:
            # Skip this line and next if it's just the closing tag
            i += 1
            removed_board = True
            continue

        # Insert board link after traffic line
        new_lines.append(line)

        if 'traffic.html' in line and not inserted_board:
            # Check if this line has the full <a> tag or just the opening
            # Insert the board link right after the traffic link
            # First, find the messenger line to insert before it
            pass

        i += 1

    # Now do a simpler approach: find+replace on joined text
    content = ''.join(new_lines)

    # Ensure board link is positioned between traffic and messenger
    # Pattern: after traffic line(s), before messenger line
    # The traffic block is:
    #   <a href="traffic.html" class="nav-item">
    #       <i ...></i> .....</a>
    # Then messenger block starts

    traffic_re = r'(<a href="traffic\.html"[^<]*<i[^<]*</i>[^\n]*</a>)\s*\n'
    messenger_str = '            <a href="messenger.html"'

    m = re.search(traffic_re, content)
    if m:
        traffic_end = m.end()
        # Check if board link already exists right after
        snippet_after = content[traffic_end:traffic_end+200]
        if 'board.html' not in snippet_after or 'board.html' not in content[traffic_end:content.index(messenger_str) if messenger_str in content else traffic_end+500]:
            # Set active class for board.html itself
            bl = BOARD_LINK
            if fn == 'board.html':
                bl = bl.replace('class="nav-item"', 'class="nav-item active"')

            # Insert board link after traffic
            content = content[:traffic_end] + bl + content[traffic_end:]

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Updated:', fn)

print('Done!')
